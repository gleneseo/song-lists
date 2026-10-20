import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { openAppDatabase, userId } from "./support/app-database";

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/auth/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth")>()),
  getSession: async () =>
    session.userId ? { user: { id: session.userId } } : null,
}));

type EditSong = typeof import("@/lib/actions/edit-song");
type UpdateSongInput = Parameters<EditSong["updateSong"]>[0];

describe("an admin editing the catalog, from the action down to the database", () => {
  let pool: Pool;
  let editSong: EditSong;
  let editArtist: typeof import("@/lib/actions/edit-artist");
  let editProduction: typeof import("@/lib/actions/edit-production");
  let al: string;
  let cliff: string;
  let judd: string;
  let listA: number;
  let listB: number;
  let filmType: number;
  let tvType: number;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    editSong = await import("@/lib/actions/edit-song");
    editArtist = await import("@/lib/actions/edit-artist");
    editProduction = await import("@/lib/actions/edit-production");
    al = await userId(pool, "Al");
    cliff = await userId(pool, "Cliff");
    judd = await userId(pool, "Judd");
    [listA, listB] = (
      await pool.query<{ id: number }>(
        "select id from song_lists.lists order by id limit 2",
      )
    ).rows.map((row) => row.id) as [number, number];
    [filmType, tvType] = (
      await pool.query<{ id: number }>(
        "select id from song_lists.production_types where name in ('Film', 'Television') order by name",
      )
    ).rows.map((row) => row.id) as [number, number];
  });

  afterAll(async () => {
    await pool.end();
  });

  const one = async <T>(sql: string, params: unknown[] = []) =>
    (await pool.query(sql, params)).rows[0] as T;

  const all = async (sql: string, params: unknown[] = []) =>
    (await pool.query(sql, params)).rows;

  const insertArtist = async (name: string) =>
    (
      await one<{ id: number }>(
        "insert into song_lists.artists (name, created_by, updated_by) values ($1, $2, $2) returning id",
        [name, al],
      )
    ).id;

  const insertSong = async (title: string, artist: number, bio?: string) =>
    (
      await one<{ id: number }>(
        "insert into song_lists.songs (title, artist_id, bio, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [title, artist, bio ?? null, al],
      )
    ).id;

  const insertProduction = async (name: string, year: number, type: number) =>
    (
      await one<{ id: number }>(
        "insert into song_lists.productions (name, release_year, type_id, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [name, year, type, al],
      )
    ).id;

  const linkIds = async (table: string, songId: number) =>
    (
      await all(
        `select id from song_lists.${table} where song_id = $1 order by id`,
        [songId],
      )
    ).map((row) => row.id as number);

  describe("who may edit", () => {
    it.each([
      ["a manager", () => cliff],
      ["an ordinary user", () => judd],
      ["someone signed out", () => null],
    ])("should refuse %s, and change nothing", async (_who, who) => {
      session.userId = who();
      const artist = await insertArtist("Zz Guarded Artist");
      const song = await insertSong("Zz Guarded Song", artist);
      const production = await insertProduction(
        "Zz Guarded Film",
        1990,
        filmType,
      );

      const songResult = await editSong.updateSong({
        songId: song,
        title: "Zz Hijacked",
        bio: "",
        newNote: "",
        artist: { kind: "existing", id: artist },
        featuredArtists: [],
        keepProductionIds: [],
        addProduction: null,
        keepCoverSongIds: [],
        addCover: null,
        listIds: [],
        advocateUserIds: [],
      });
      const artistResult = await editArtist.updateArtist({
        artistId: artist,
        name: "Zz Hijacked",
      });
      const productionResult = await editProduction.updateProduction({
        productionId: production,
        name: "Zz Hijacked",
        releaseYear: 1991,
        typeId: tvType,
      });
      const loaded = await editSong.loadSongForEdit(song);

      expect(songResult).toMatchObject({ status: "error" });
      expect(artistResult).toMatchObject({ status: "error" });
      expect(productionResult).toMatchObject({ status: "error" });
      expect(loaded).toMatchObject({ status: "error" });
      expect(
        await one("select title from song_lists.songs where id = $1", [song]),
      ).toEqual({ title: "Zz Guarded Song" });
      expect(
        await one("select name from song_lists.artists where id = $1", [
          artist,
        ]),
      ).toEqual({ name: "Zz Guarded Artist" });
      expect(
        await one(
          "select name, release_year from song_lists.productions where id = $1",
          [production],
        ),
      ).toEqual({ name: "Zz Guarded Film", release_year: 1990 });
    });

    it("should read the role from the database each time, so a demotion takes effect at once", async () => {
      session.userId = judd;
      const artist = await insertArtist("Zz Role Artist");

      await pool.query(
        "update song_lists.users set role = 'admin' where id = $1",
        [judd],
      );
      expect(
        await editArtist.updateArtist({
          artistId: artist,
          name: "Zz Role Artist Two",
        }),
      ).toEqual({ status: "updated" });

      await pool.query(
        "update song_lists.users set role = 'user' where id = $1",
        [judd],
      );
      expect(
        await editArtist.updateArtist({
          artistId: artist,
          name: "Zz Role Artist Three",
        }),
      ).toMatchObject({ status: "error" });
      expect(
        await one("select name from song_lists.artists where id = $1", [
          artist,
        ]),
      ).toEqual({ name: "Zz Role Artist Two" });
    });
  });

  describe("loading a song to edit", () => {
    it("should hand an admin the song's current values", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Load Artist");
      const song = await insertSong("Zz Load Song", artist, "Some notes");

      const loaded = await editSong.loadSongForEdit(song);

      expect(loaded).toMatchObject({
        status: "ok",
        data: { songId: song, title: "Zz Load Song", bio: "Some notes" },
      });
    });

    it("should say so when the song isn't there", async () => {
      session.userId = al;

      expect(await editSong.loadSongForEdit(999_999)).toEqual({
        status: "error",
        message: "That song couldn't be found.",
      });
    });
  });

  describe("editing a song", () => {
    const blank = (song: number, artist: number): UpdateSongInput => ({
      songId: song,
      title: "Zz Edited Song",
      bio: "",
      newNote: "",
      artist: { kind: "existing", id: artist },
      featuredArtists: [],
      keepProductionIds: [],
      addProduction: null,
      keepCoverSongIds: [],
      addCover: null,
      listIds: [],
      advocateUserIds: [],
    });

    it("should bring every kind of link in line with what the form submitted", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Edit Artist");
      const featuredOld = await insertArtist("Zz Featured Old");
      const featuredNew = await insertArtist("Zz Featured New");
      const song = await insertSong("Zz Edit Me", artist, "Old notes");
      const original = await insertSong(
        "Zz Original",
        await insertArtist("Zz Orig Artist"),
      );
      const productionOld = await insertProduction(
        "Zz Film Old",
        1980,
        filmType,
      );
      const productionNew = await insertProduction(
        "Zz Film New",
        1981,
        filmType,
      );

      await pool.query(
        "insert into song_lists.song_featured_artists (song_id, artist_id, created_by, updated_by) values ($1, $2, $3, $3)",
        [song, featuredOld, al],
      );
      await pool.query(
        "insert into song_lists.song_productions (song_id, production_id, created_by, updated_by) values ($1, $2, $3, $3)",
        [song, productionOld, al],
      );
      await pool.query(
        "insert into song_lists.song_covers (song_id, original_song_id, created_by, updated_by) values ($1, $2, $3, $3)",
        [song, original, al],
      );
      await pool.query(
        "insert into song_lists.list_songs (list_id, song_id, created_by, updated_by) values ($1, $2, $3, $3)",
        [listA, song, al],
      );
      await pool.query(
        "insert into song_lists.song_advocates (song_id, user_id, created_by, updated_by) values ($1, $2, $3, $3)",
        [song, cliff, al],
      );

      const result = await editSong.updateSong({
        ...blank(song, artist),
        title: "  Zz   Renamed   Song ",
        bio: "Old notes",
        newNote: "Great live.",
        artist: { kind: "new", name: "Zz Brand New Artist" },
        featuredArtists: [{ kind: "existing", id: featuredNew }],
        keepProductionIds: [],
        addProduction: { kind: "existing", id: productionNew },
        keepCoverSongIds: [],
        listIds: [listB],
        advocateUserIds: [judd],
      });

      expect(result).toEqual({ status: "updated" });

      const row = await one<{
        title: string;
        bio: string;
        artist: string;
        updated_by: string;
      }>(
        `select s.title, s.bio, a.name artist, s.updated_by from song_lists.songs s
         join song_lists.artists a on a.id = s.artist_id where s.id = $1`,
        [song],
      );
      expect(row.title).toBe("Zz Renamed Song");
      expect(row.artist).toBe("Zz Brand New Artist");
      expect(row.updated_by).toBe(al);
      expect(row.bio.split("\n")).toEqual([
        "Old notes",
        expect.stringMatching(/^Great live\. — Al · .+ (PDT|PST)$/),
      ]);

      expect(
        (
          await all(
            "select artist_id from song_lists.song_featured_artists where song_id = $1",
            [song],
          )
        ).map((r) => r.artist_id),
      ).toEqual([featuredNew]);
      expect(
        (
          await all(
            "select production_id from song_lists.song_productions where song_id = $1",
            [song],
          )
        ).map((r) => r.production_id),
      ).toEqual([productionNew]);
      expect(await linkIds("song_covers", song)).toEqual([]);
      expect(
        (
          await all(
            "select list_id from song_lists.list_songs where song_id = $1",
            [song],
          )
        ).map((r) => r.list_id),
      ).toEqual([listB]);
      expect(
        (
          await all(
            "select user_id from song_lists.song_advocates where song_id = $1",
            [song],
          )
        ).map((r) => r.user_id),
      ).toEqual([judd]);
    });

    it("should leave links that are already right untouched", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Keep Artist");
      const song = await insertSong("Zz Keep Me", artist);
      const production = await insertProduction("Zz Keep Film", 1982, filmType);
      await pool.query(
        "insert into song_lists.song_productions (song_id, production_id, created_by, updated_by) values ($1, $2, $3, $3)",
        [song, production, al],
      );
      await pool.query(
        "insert into song_lists.list_songs (list_id, song_id, created_by, updated_by) values ($1, $2, $3, $3)",
        [listA, song, al],
      );
      const productionLinks = await linkIds("song_productions", song);
      const listLinks = await linkIds("list_songs", song);

      const result = await editSong.updateSong({
        ...blank(song, artist),
        title: "Zz Keep Me",
        keepProductionIds: [production],
        listIds: [listA],
      });

      expect(result).toEqual({ status: "updated" });
      expect(await linkIds("song_productions", song)).toEqual(productionLinks);
      expect(await linkIds("list_songs", song)).toEqual(listLinks);
    });

    it("should refuse to rename a song to another by the same artist, and change nothing", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Twin Artist");
      await insertSong("Zz Twin One", artist);
      const song = await insertSong("Zz Twin Two", artist);

      const result = await editSong.updateSong({
        ...blank(song, artist),
        title: "zz twin one",
      });

      expect(result).toMatchObject({
        status: "duplicate",
        existing: { title: "Zz Twin One", artistName: "Zz Twin Artist" },
      });
      expect(
        await one("select title from song_lists.songs where id = $1", [song]),
      ).toEqual({ title: "Zz Twin Two" });
    });

    it("should let a song keep its own title", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Same Title Artist");
      const song = await insertSong("Zz Same Title", artist);

      expect(
        await editSong.updateSong({
          ...blank(song, artist),
          title: "Zz Same Title",
        }),
      ).toEqual({ status: "updated" });
    });

    it("should undo the whole edit if it fails part way", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Atomic Artist");
      const song = await insertSong(
        "Zz Atomic Song",
        artist,
        "Untouched notes",
      );

      const result = await editSong.updateSong({
        ...blank(song, artist),
        title: "Zz Atomic Renamed",
        bio: "Changed notes",
        artist: { kind: "new", name: "Zz Atomic New Artist" },
        addCover: { kind: "existing", songId: song },
      });

      expect(result).toEqual({
        status: "error",
        message: "A song can't be a cover of itself.",
      });
      expect(
        await one("select title, bio from song_lists.songs where id = $1", [
          song,
        ]),
      ).toEqual({ title: "Zz Atomic Song", bio: "Untouched notes" });
      expect(
        await one(
          "select count(*)::int n from song_lists.artists where name = 'Zz Atomic New Artist'",
        ),
      ).toEqual({ n: 0 });
    });

    it("should say so when the song isn't there", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Ghost Artist");

      expect(
        await editSong.updateSong({
          ...blank(999_999, artist),
          title: "Zz Ghost",
        }),
      ).toEqual({ status: "error", message: "That song couldn't be found." });
    });

    it("should refuse a blank title", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Blank Artist");
      const song = await insertSong("Zz Blank Song", artist);

      expect(
        await editSong.updateSong({ ...blank(song, artist), title: "  " }),
      ).toEqual({
        status: "error",
        message: "Title is required.",
      });
    });
  });

  describe("renaming an artist", () => {
    it("should rename and record who did it", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Old Name");

      expect(
        await editArtist.updateArtist({
          artistId: artist,
          name: "  Zz   New   Name ",
        }),
      ).toEqual({ status: "updated" });
      expect(
        await one(
          "select name, updated_by from song_lists.artists where id = $1",
          [artist],
        ),
      ).toEqual({ name: "Zz New Name", updated_by: al });
    });

    it("should refuse a name another artist already has, in any case", async () => {
      session.userId = al;
      await insertArtist("Zz Taken Name");
      const artist = await insertArtist("Zz Wants A Name");

      expect(
        await editArtist.updateArtist({
          artistId: artist,
          name: "ZZ TAKEN NAME",
        }),
      ).toEqual({ status: "duplicate", existingName: "Zz Taken Name" });
    });

    it("should say so when the artist or the name is missing", async () => {
      session.userId = al;
      const artist = await insertArtist("Zz Blank Name Artist");

      expect(
        await editArtist.updateArtist({ artistId: 999_999, name: "Zz Nobody" }),
      ).toEqual({
        status: "error",
        message: "That artist couldn't be found.",
      });
      expect(
        await editArtist.updateArtist({ artistId: artist, name: " " }),
      ).toEqual({
        status: "error",
        message: "Name is required.",
      });
    });
  });

  describe("editing a production", () => {
    it("should change its name, year, and type", async () => {
      session.userId = al;
      const production = await insertProduction("Zz Old Film", 1970, filmType);

      expect(
        await editProduction.updateProduction({
          productionId: production,
          name: "Zz New Show",
          releaseYear: 1995,
          typeId: tvType,
        }),
      ).toEqual({ status: "updated" });
      expect(
        await one(
          "select name, release_year, type_id, updated_by from song_lists.productions where id = $1",
          [production],
        ),
      ).toEqual({
        name: "Zz New Show",
        release_year: 1995,
        type_id: tvType,
        updated_by: al,
      });
    });

    it("should refuse the same name in the same year, but not another year", async () => {
      session.userId = al;
      await insertProduction("Zz Remake", 1990, filmType);
      const other = await insertProduction("Zz Other", 1991, filmType);

      expect(
        await editProduction.updateProduction({
          productionId: other,
          name: "zz remake",
          releaseYear: 1990,
          typeId: filmType,
        }),
      ).toEqual({
        status: "duplicate",
        existingName: "Zz Remake",
        releaseYear: 1990,
      });
      expect(
        await editProduction.updateProduction({
          productionId: other,
          name: "Zz Remake",
          releaseYear: 1991,
          typeId: filmType,
        }),
      ).toEqual({ status: "updated" });
    });

    it.each([
      ["a blank name", { name: " " }, "Name is required."],
      [
        "a year that can't be right",
        { releaseYear: 1700 },
        "Enter a valid release year.",
      ],
      [
        "a type that doesn't exist",
        { typeId: 999_999 },
        "Pick a production type.",
      ],
    ])("should refuse %s", async (_what, change, message) => {
      session.userId = al;
      const production = await insertProduction(
        "Zz Picky Film",
        2000,
        filmType,
      );

      expect(
        await editProduction.updateProduction({
          productionId: production,
          name: "Zz Picky Film",
          releaseYear: 2000,
          typeId: filmType,
          ...change,
        }),
      ).toEqual({ status: "error", message });
    });

    it("should say so when the production isn't there", async () => {
      session.userId = al;

      expect(
        await editProduction.updateProduction({
          productionId: 999_999,
          name: "Zz Ghost Film",
          releaseYear: 2000,
          typeId: filmType,
        }),
      ).toEqual({
        status: "error",
        message: "That production couldn't be found.",
      });
    });
  });
});
