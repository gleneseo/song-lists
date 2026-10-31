import type { SongLookupResult } from "@song-lists/song-metadata";
import type { Pool } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
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

// Collects what the action asks to run after its response, so a test decides
// when that happens instead of needing a real request.
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

describe("looking a song up when it is added, down to the database", () => {
  let pool: Pool;
  let add: typeof import("@/lib/actions/add-song");
  let metadata: typeof import("@/lib/queries/song-metadata");
  let al: string;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    add = await import("@/lib/actions/add-song");
    metadata = await import("@/lib/queries/song-metadata");
    al = await userId(pool, "Al");
  });

  // The seed ships with lookup results; each test starts from none.
  beforeEach(async () => {
    await pool.query("delete from song_lists.song_metadata");
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(() => {
    background.tasks.length = 0;
    background.lookup.mockReset();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const finishBackgroundWork = async () => {
    await Promise.all(background.tasks.splice(0).map((task) => task()));
  };

  const addSong = async (title: string, artist = "Zz Lookup Band") => {
    session.userId = al;
    const result = await add.createSong({
      artist: { kind: "new", name: artist },
      title,
      featuredArtists: [],
      production: null,
      cover: null,
      listIds: [],
      advocateUserIds: [],
    });

    if (result.status !== "created") {
      throw new Error(`Expected the song to be added, got ${result.status}`);
    }

    return result.songId;
  };

  const metadataOf = async (id: number) =>
    (
      await pool.query<{
        status: string;
        source: string | null;
        source_track_id: string | null;
        artwork_url: string | null;
        album_name: string | null;
        release_year: number | null;
        details_matched_by: string;
        artwork_matched_by: string;
        created_by: string;
      }>("select * from song_lists.song_metadata where song_id = $1", [id])
    ).rows;

  it("should save what iTunes shows once the song has been added", async () => {
    background.lookup.mockResolvedValue(found);

    const id = await addSong("Zz Found Song");

    expect(await metadataOf(id)).toEqual([]);

    await finishBackgroundWork();

    expect(background.lookup).toHaveBeenCalledWith({
      title: "Zz Found Song",
      artistName: "Zz Lookup Band",
    });
    expect(await metadataOf(id)).toEqual([
      expect.objectContaining({
        status: "matched",
        source: "itunes",
        source_track_id: "1234",
        artwork_url: "https://example.test/art/100x100bb.jpg",
        album_name: "An Album",
        release_year: 1981,
        details_matched_by: "auto",
        artwork_matched_by: "auto",
        created_by: "00000000-0000-0000-0000-000000000000",
      }),
    ]);
  });

  it("should remember that nothing was found, so nobody asks again for it", async () => {
    background.lookup.mockResolvedValue({ status: "not_found" });

    const id = await addSong("Zz Unknown Song");
    await finishBackgroundWork();

    expect(await metadataOf(id)).toEqual([
      expect.objectContaining({
        status: "not_found",
        source: null,
        artwork_url: null,
        album_name: null,
        release_year: null,
      }),
    ]);
  });

  it("should record a failed lookup, and say why in the log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    background.lookup.mockResolvedValue({
      status: "error",
      message: "iTunes answered 429.",
    });

    const id = await addSong("Zz Failed Song");
    await finishBackgroundWork();

    expect(await metadataOf(id)).toEqual([
      expect.objectContaining({ status: "error", source: null }),
    ]);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("iTunes answered 429."),
    );
  });

  it("should still have added the song when the lookup blows up", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    background.lookup.mockRejectedValue(new Error("boom"));

    const id = await addSong("Zz Blown Song");
    await finishBackgroundWork();

    expect(await metadataOf(id)).toEqual([]);
    expect(log).toHaveBeenCalled();
    expect(
      (await pool.query("select 1 from song_lists.songs where id = $1", [id]))
        .rowCount,
    ).toBe(1);
  });

  it("should not look anything up for a song that wasn't added", async () => {
    session.userId = al;
    const result = await add.createSong({
      artist: { kind: "new", name: "Zz Lookup Band" },
      title: "   ",
      featuredArtists: [],
      production: null,
      cover: null,
      listIds: [],
      advocateUserIds: [],
    });

    await finishBackgroundWork();

    expect(result.status).toBe("error");
    expect(background.lookup).not.toHaveBeenCalled();
  });

  it("should look nothing up when lookups are switched off", async () => {
    vi.stubEnv("SONG_METADATA_LOOKUP", "off");

    const id = await addSong("Zz Switched Off Song");
    await finishBackgroundWork();

    expect(background.lookup).not.toHaveBeenCalled();
    expect(await metadataOf(id)).toEqual([]);
  });

  it("should do nothing for a song that no longer exists", async () => {
    await metadata.recordSongMetadata(2_000_000_000);

    expect(background.lookup).not.toHaveBeenCalled();
  });

  describe("looking a song up again", () => {
    it("should replace an earlier automatic result with the new one", async () => {
      const id = await songId(pool, "Cover Me", "Candlebox");

      background.lookup.mockResolvedValueOnce({ status: "not_found" });
      await metadata.recordSongMetadata(id);
      background.lookup.mockResolvedValueOnce(found);
      await metadata.recordSongMetadata(id);

      expect(await metadataOf(id)).toEqual([
        expect.objectContaining({ status: "matched", album_name: "An Album" }),
      ]);
    });

    it("should keep details already found when a later lookup fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const id = await songId(pool, "Stars", "Hum");

      background.lookup.mockResolvedValueOnce(found);
      await metadata.recordSongMetadata(id);
      background.lookup.mockResolvedValueOnce({
        status: "error",
        message: "offline",
      });
      await metadata.recordSongMetadata(id);

      expect(await metadataOf(id)).toEqual([
        expect.objectContaining({ status: "matched", album_name: "An Album" }),
      ]);
    });

    it("should never undo a match that a person chose", async () => {
      const id = await songId(pool, "The Pod", "Hum");

      await pool.query(
        `insert into song_lists.song_metadata
           (song_id, status, source, album_name, details_matched_by, artwork_matched_by, fetched_at, created_by, updated_by)
         values ($1, 'matched', 'itunes', 'Chosen By Hand', 'manual', 'manual', now(), $2, $2)`,
        [id, al],
      );
      background.lookup.mockResolvedValueOnce(found);
      await metadata.recordSongMetadata(id);

      expect(await metadataOf(id)).toEqual([
        expect.objectContaining({
          album_name: "Chosen By Hand",
          details_matched_by: "manual",
        }),
      ]);
    });

    it("should refresh the details but keep cover art that a person chose", async () => {
      const id = await songId(pool, "The Pod", "Hum");

      await pool.query(
        `insert into song_lists.song_metadata
           (song_id, status, source, artwork_url, album_name, details_matched_by, artwork_matched_by, fetched_at, created_by, updated_by)
         values ($1, 'matched', 'itunes', '/album-art/own.jpg', 'Old Album', 'auto', 'manual', now(), $2, $2)`,
        [id, al],
      );
      background.lookup.mockResolvedValueOnce(found);
      await metadata.recordSongMetadata(id);

      expect(await metadataOf(id)).toEqual([
        expect.objectContaining({
          album_name: "An Album",
          artwork_url: "/album-art/own.jpg",
          details_matched_by: "auto",
          artwork_matched_by: "manual",
        }),
      ]);
    });

    it("should replace cover art that an earlier lookup picked", async () => {
      const id = await songId(pool, "The Pod", "Hum");

      await pool.query(
        `insert into song_lists.song_metadata
           (song_id, status, source, artwork_url, album_name, details_matched_by, artwork_matched_by, fetched_at, created_by, updated_by)
         values ($1, 'matched', 'itunes', 'https://example.test/old.jpg', 'Old Album', 'auto', 'auto', now(), $2, $2)`,
        [id, al],
      );
      background.lookup.mockResolvedValueOnce(found);
      await metadata.recordSongMetadata(id);

      expect(await metadataOf(id)).toEqual([
        expect.objectContaining({
          artwork_url: "https://example.test/art/100x100bb.jpg",
          artwork_matched_by: "auto",
        }),
      ]);
    });

    it("should drop cover art that a person chose when nothing matches any more", async () => {
      const id = await songId(pool, "The Pod", "Hum");

      await pool.query(
        `insert into song_lists.song_metadata
           (song_id, status, source, artwork_url, album_name, details_matched_by, artwork_matched_by, fetched_at, created_by, updated_by)
         values ($1, 'matched', 'itunes', '/album-art/own.jpg', 'Old Album', 'auto', 'manual', now(), $2, $2)`,
        [id, al],
      );
      background.lookup.mockResolvedValueOnce({ status: "not_found" });
      await metadata.recordSongMetadata(id);

      expect(await metadataOf(id)).toEqual([
        expect.objectContaining({
          status: "not_found",
          artwork_url: null,
          artwork_matched_by: "auto",
        }),
      ]);
    });
  });
});
