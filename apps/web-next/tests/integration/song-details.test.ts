import type { SongLookupResult } from "@song-lists/song-metadata";
import type { SongDetailsInput } from "@/lib/songs/song-details-input";
import type { Pool } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { openAppDatabase, songId, userId } from "./support/app-database";

const session = vi.hoisted(() => ({ userId: null as string | null }));
const background = vi.hoisted(() => ({
  tasks: [] as (() => unknown)[],
  lookup:
    vi.fn<
      (wanted: { title: string; artistName: string }) => Promise<unknown>
    >(),
}));

vi.mock("@/lib/auth/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth")>()),
  getSession: async () =>
    session.userId ? { user: { id: session.userId } } : null,
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    background.tasks.push(task);
  },
}));

// Never reaches iTunes or MusicBrainz: the lookup answers whatever the test says it does.
vi.mock("@song-lists/song-metadata", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@song-lists/song-metadata")>()),
  createSongLookup: () => background.lookup,
}));

const found: SongLookupResult = {
  status: "matched",
  source: "itunes",
  sourceTrackId: "1234",
  artworkUrl: "https://example.test/art/100x100bb.jpg",
  albumName: "An Album",
  releaseYear: 1981,
  isAlbum: true,
};

const typed: SongDetailsInput = {
  albumName: "  A Tightened   Album ",
  releaseYear: "1982",
  artworkUrl: "https://example.test/art/tight.jpg",
  source: null,
  sourceTrackId: null,
};

describe("an admin looking up and setting a song's album details, down to the database", () => {
  let pool: Pool;
  let find: typeof import("@/lib/actions/find-song-details");
  let add: typeof import("@/lib/actions/add-song");
  let edit: typeof import("@/lib/actions/edit-song");
  let editData: typeof import("@/lib/queries/song-edit");
  let metadata: typeof import("@/lib/queries/song-metadata");
  let al: string;
  let cliff: string;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    find = await import("@/lib/actions/find-song-details");
    add = await import("@/lib/actions/add-song");
    edit = await import("@/lib/actions/edit-song");
    editData = await import("@/lib/queries/song-edit");
    metadata = await import("@/lib/queries/song-metadata");
    al = await userId(pool, "Al");
    cliff = await userId(pool, "Cliff");
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(() => {
    background.tasks.length = 0;
    background.lookup.mockReset();
    vi.unstubAllEnvs();
  });

  const rowsOf = async (id: number) =>
    (
      await pool.query<{
        status: string;
        source: string | null;
        source_track_id: string | null;
        artwork_url: string | null;
        album_name: string | null;
        release_year: number | null;
        matched_by: string;
        updated_by: string;
      }>("select * from song_lists.song_metadata where song_id = $1", [id])
    ).rows;

  const newSong = (title: string, details?: SongDetailsInput) => ({
    artist: { kind: "new" as const, name: "Zz Details Band" },
    title,
    featuredArtists: [],
    production: null,
    cover: null,
    listIds: [],
    advocateUserIds: [],
    ...(details ? { details } : {}),
  });

  describe("looking a song up", () => {
    it("should turn away someone who isn't signed in", async () => {
      session.userId = null;

      await expect(
        find.findSongDetails({ title: "Anything", artistName: "Anyone" }),
      ).resolves.toEqual({
        status: "error",
        message: "Only admins can look up album details.",
      });
      expect(background.lookup).not.toHaveBeenCalled();
    });

    it("should turn away a signed-in person who isn't an admin", async () => {
      session.userId = cliff;

      await expect(
        find.findSongDetails({ title: "Anything", artistName: "Anyone" }),
      ).resolves.toMatchObject({ status: "error" });
      expect(background.lookup).not.toHaveBeenCalled();
    });

    it("should ask for a title and an artist", async () => {
      session.userId = al;

      await expect(
        find.findSongDetails({ title: "  ", artistName: "Anyone" }),
      ).resolves.toEqual({
        status: "error",
        message: "Give the song a title and an artist to look it up.",
      });
      await expect(
        find.findSongDetails({ title: "Anything", artistName: "" }),
      ).resolves.toMatchObject({ status: "error" });
      expect(background.lookup).not.toHaveBeenCalled();
    });

    it("should give back what the lookup found, as text to correct, without saving it", async () => {
      session.userId = al;
      background.lookup.mockResolvedValue(found);
      const before = await pool.query(
        "select count(*) from song_lists.song_metadata",
      );

      await expect(
        find.findSongDetails({
          title: "  Some   Song ",
          artistName: "Some Band",
        }),
      ).resolves.toEqual({
        status: "found",
        matched: { title: "Some Song", artistName: "Some Band" },
        details: {
          albumName: "An Album",
          releaseYear: "1981",
          artworkUrl: "https://example.test/art/100x100bb.jpg",
          source: "itunes",
          sourceTrackId: "1234",
        },
      });
      expect(background.lookup).toHaveBeenCalledWith({
        title: "Some Song",
        artistName: "Some Band",
      });
      expect(
        await pool.query("select count(*) from song_lists.song_metadata"),
      ).toEqual(before);
    });

    it("should say which song the service matched, when its spelling differs from the one asked for", async () => {
      session.userId = al;
      background.lookup.mockResolvedValue({
        ...found,
        matchedTitle: "Take Shots With Alcohol",
        matchedArtistName: "Alkaline Trio",
      });

      await expect(
        find.findSongDetails({
          title: "Take Lots With Alcohol",
          artistName: "Alkaline Trio",
        }),
      ).resolves.toMatchObject({
        status: "found",
        matched: {
          title: "Take Shots With Alcohol",
          artistName: "Alkaline Trio",
        },
      });
    });

    it("should give back blanks for what the lookup left out", async () => {
      session.userId = al;
      background.lookup.mockResolvedValue({
        ...found,
        artworkUrl: null,
        albumName: null,
        releaseYear: null,
      });

      await expect(
        find.findSongDetails({ title: "Some Song", artistName: "Some Band" }),
      ).resolves.toMatchObject({
        details: { albumName: "", releaseYear: "", artworkUrl: "" },
      });
    });

    it("should say when nothing matched", async () => {
      session.userId = al;
      background.lookup.mockResolvedValue({ status: "not_found" });

      await expect(
        find.findSongDetails({ title: "Some Song", artistName: "Some Band" }),
      ).resolves.toEqual({ status: "not_found" });
    });

    it("should say when the lookup failed, and that trying again may help", async () => {
      session.userId = al;
      background.lookup.mockResolvedValue({
        status: "error",
        message: "iTunes answered 503.",
      });

      await expect(
        find.findSongDetails({ title: "Some Song", artistName: "Some Band" }),
      ).resolves.toEqual({
        status: "error",
        message:
          "The lookup didn't work (iTunes answered 503.). Try again in a moment.",
      });
    });

    describe("with the stand-in service the browser tests use", () => {
      it("should find any song on a stand-in album", async () => {
        session.userId = al;
        vi.stubEnv("SONG_METADATA_PREVIEW", "stub");

        await expect(
          find.findSongDetails({ title: "Some Song", artistName: "Some Band" }),
        ).resolves.toMatchObject({
          status: "found",
          details: {
            albumName: "Stub Album for Some Song",
            releaseYear: "1999",
          },
        });
        expect(background.lookup).not.toHaveBeenCalled();
      });

      it("should not find a title that asks for nothing to be found", async () => {
        session.userId = al;
        vi.stubEnv("SONG_METADATA_PREVIEW", "stub");

        await expect(
          find.findSongDetails({
            title: "Nothing Found Here",
            artistName: "Some Band",
          }),
        ).resolves.toEqual({ status: "not_found" });
      });

      it("should fail on a title that asks for a failure", async () => {
        session.userId = al;
        vi.stubEnv("SONG_METADATA_PREVIEW", "stub");

        await expect(
          find.findSongDetails({
            title: "Lookup Failure Here",
            artistName: "Some Band",
          }),
        ).resolves.toMatchObject({ status: "error" });
      });
    });
  });

  describe("adding a song with details", () => {
    it("should save an admin's details as chosen by hand, and skip the automatic lookup", async () => {
      session.userId = al;

      const result = await add.createSong(newSong("Zz Admin Added", typed));

      expect(result.status).toBe("created");
      const id = await songId(pool, "Zz Admin Added", "Zz Details Band");

      expect(await rowsOf(id)).toEqual([
        expect.objectContaining({
          status: "matched",
          source: null,
          source_track_id: null,
          artwork_url: "https://example.test/art/tight.jpg",
          album_name: "A Tightened Album",
          release_year: 1982,
          matched_by: "manual",
          updated_by: al,
        }),
      ]);
      expect(background.tasks).toHaveLength(0);
    });

    it("should keep the service a looked-up album came from", async () => {
      session.userId = al;

      await add.createSong(
        newSong("Zz Admin Looked Up", {
          ...typed,
          source: "itunes",
          sourceTrackId: "1234",
        }),
      );

      expect(
        await rowsOf(
          await songId(pool, "Zz Admin Looked Up", "Zz Details Band"),
        ),
      ).toEqual([
        expect.objectContaining({ source: "itunes", source_track_id: "1234" }),
      ]);
    });

    it("should still look the song up afterwards when no details were given", async () => {
      session.userId = al;

      await add.createSong(newSong("Zz Admin Without Details"));

      expect(background.tasks).toHaveLength(1);
    });

    it("should refuse details from someone who isn't an admin, and add nothing", async () => {
      session.userId = cliff;

      const result = await add.createSong(newSong("Zz Manager Added", typed));

      expect(result).toEqual({
        status: "error",
        message: "Only admins can set a song's album details.",
      });
      expect(
        (
          await pool.query(
            "select 1 from song_lists.songs where title = 'Zz Manager Added'",
          )
        ).rowCount,
      ).toBe(0);
    });

    it("should refuse details that don't check out, and add nothing", async () => {
      session.userId = al;

      const result = await add.createSong(
        newSong("Zz Bad Details", { ...typed, releaseYear: "19" }),
      );

      expect(result).toMatchObject({ status: "error" });
      expect(
        (
          await pool.query(
            "select 1 from song_lists.songs where title = 'Zz Bad Details'",
          )
        ).rowCount,
      ).toBe(0);
    });
  });

  describe("editing a song's details", () => {
    const editInput = (id: number, extra: Record<string, unknown> = {}) => ({
      songId: id,
      title: "Zz Edited",
      bio: "",
      originalBio: "",
      newNote: "",
      artist: { kind: "new" as const, name: "Zz Details Band" },
      featuredArtists: [],
      keepProductionIds: [],
      addProduction: null,
      keepCoverSongIds: [],
      addCover: null,
      listIds: [],
      advocateUserIds: [],
      ...extra,
    });

    const makeSong = async (title: string) => {
      session.userId = al;
      await add.createSong(newSong(title));
      background.tasks.length = 0;

      return songId(pool, title, "Zz Details Band");
    };

    it("should give the form the details a song shows now", async () => {
      const id = await makeSong("Zz Shows Details");
      await pool.query(
        `insert into song_lists.song_metadata
           (song_id, status, source, source_track_id, artwork_url, album_name, release_year, matched_by, fetched_at, created_by, updated_by)
         values ($1, 'matched', 'itunes', '99', 'https://example.test/a.jpg', 'Shown Album', 1975, 'auto', now(), $2, $2)`,
        [id, al],
      );

      const data = await editData.getSongEditData(id);

      expect(data?.details).toEqual({
        albumName: "Shown Album",
        releaseYear: "1975",
        artworkUrl: "https://example.test/a.jpg",
        source: "itunes",
        sourceTrackId: "99",
      });
    });

    it("should give the form blanks for what a matched song lacks", async () => {
      const id = await makeSong("Zz Sparse Details");
      await pool.query(
        `insert into song_lists.song_metadata
           (song_id, status, matched_by, fetched_at, created_by, updated_by)
         values ($1, 'matched', 'manual', now(), $2, $2)`,
        [id, al],
      );

      expect((await editData.getSongEditData(id))?.details).toEqual({
        albumName: "",
        releaseYear: "",
        artworkUrl: "",
        source: null,
        sourceTrackId: null,
      });
    });

    it("should give the form no details for a song with none, or none found", async () => {
      const none = await makeSong("Zz No Details");
      const missed = await makeSong("Zz Missed Details");
      await pool.query(
        `insert into song_lists.song_metadata
           (song_id, status, matched_by, fetched_at, created_by, updated_by)
         values ($1, 'not_found', 'auto', now(), $2, $2)`,
        [missed, al],
      );

      expect((await editData.getSongEditData(none))?.details).toBeNull();
      expect((await editData.getSongEditData(missed))?.details).toBeNull();
    });

    it("should save details for a song that had none, as chosen by hand", async () => {
      const id = await makeSong("Zz Gets Details");

      const result = await edit.updateSong(editInput(id, { details: typed }));

      expect(result).toEqual({ status: "updated" });
      expect(await rowsOf(id)).toEqual([
        expect.objectContaining({
          album_name: "A Tightened Album",
          release_year: 1982,
          matched_by: "manual",
        }),
      ]);
    });

    it("should replace what a lookup had found, so it isn't replaced in turn", async () => {
      const id = await makeSong("Zz Replaces Details");
      await pool.query(
        `insert into song_lists.song_metadata
           (song_id, status, source, source_track_id, artwork_url, album_name, release_year, matched_by, fetched_at, created_by, updated_by)
         values ($1, 'matched', 'itunes', '99', 'https://example.test/a.jpg', 'Found Album', 1975, 'auto', now(), $2, $2)`,
        [id, al],
      );

      await edit.updateSong(editInput(id, { details: typed }));

      expect(await rowsOf(id)).toEqual([
        expect.objectContaining({
          source: null,
          source_track_id: null,
          album_name: "A Tightened Album",
          matched_by: "manual",
          updated_by: al,
        }),
      ]);
    });

    it("should leave the details alone when the form sends none", async () => {
      const id = await makeSong("Zz Keeps Details");
      await edit.updateSong(editInput(id, { details: typed }));

      await edit.updateSong(editInput(id));

      expect(await rowsOf(id)).toEqual([
        expect.objectContaining({ album_name: "A Tightened Album" }),
      ]);
    });

    it("should take a song's details away, leaving a row that says none were found, by hand", async () => {
      const id = await makeSong("Zz Loses Details");
      await edit.updateSong(editInput(id, { details: typed }));

      const result = await edit.updateSong(
        editInput(id, { removeDetails: true }),
      );

      expect(result).toEqual({ status: "updated" });
      expect(await rowsOf(id)).toEqual([
        expect.objectContaining({
          status: "not_found",
          source: null,
          source_track_id: null,
          artwork_url: null,
          album_name: null,
          release_year: null,
          matched_by: "manual",
          updated_by: al,
        }),
      ]);
      expect((await editData.getSongEditData(id))?.details).toBeNull();
    });

    it("should not let an automatic lookup put removed details back", async () => {
      const id = await makeSong("Zz Stays Removed");
      await edit.updateSong(editInput(id, { details: typed }));
      await edit.updateSong(editInput(id, { removeDetails: true }));
      background.lookup.mockResolvedValue(found);

      await metadata.recordSongMetadata(id);

      expect(await rowsOf(id)).toEqual([
        expect.objectContaining({ status: "not_found", album_name: null }),
      ]);
    });

    it("should remove details even from a song that had none yet", async () => {
      const id = await makeSong("Zz Never Had Details");

      await edit.updateSong(editInput(id, { removeDetails: true }));

      expect(await rowsOf(id)).toEqual([
        expect.objectContaining({ status: "not_found", matched_by: "manual" }),
      ]);
    });

    it("should remove, rather than save, when the form asks for both", async () => {
      const id = await makeSong("Zz Asked For Both");

      await edit.updateSong(
        editInput(id, { details: typed, removeDetails: true }),
      );

      expect(await rowsOf(id)).toEqual([
        expect.objectContaining({ status: "not_found", album_name: null }),
      ]);
    });

    it("should refuse details that don't check out, and change nothing", async () => {
      const id = await makeSong("Zz Refuses Details");

      const result = await edit.updateSong(
        editInput(id, { details: { ...typed, artworkUrl: "nonsense" } }),
      );

      expect(result).toMatchObject({ status: "error" });
      expect(await rowsOf(id)).toEqual([]);
      expect(
        (
          await pool.query("select title from song_lists.songs where id = $1", [
            id,
          ])
        ).rows[0],
      ).toEqual({ title: "Zz Refuses Details" });
    });
  });
});
