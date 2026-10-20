import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  artistId,
  openAppDatabase,
  songId,
  userId,
} from "./support/app-database";

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/auth/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth")>()),
  getSession: async () =>
    session.userId ? { user: { id: session.userId } } : null,
}));

type AddSong = typeof import("@/lib/actions/add-song");
type CreateInput = Parameters<AddSong["createSong"]>[0];

describe("adding a song, from the form's action down to the database", () => {
  let pool: Pool;
  let add: AddSong;
  let al: string;
  let cliff: string;
  let masterId: number;
  let filmTypeId: number;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    add = await import("@/lib/actions/add-song");
    al = await userId(pool, "Al");
    cliff = await userId(pool, "Cliff");
    masterId = (
      await pool.query<{ id: number }>(
        "select id from song_lists.lists where name = 'The Master List'",
      )
    ).rows[0]?.id as number;
    filmTypeId = (
      await pool.query<{ id: number }>(
        "select id from song_lists.production_types where name = 'Film'",
      )
    ).rows[0]?.id as number;
  });

  afterAll(async () => {
    await pool.end();
  });

  const count = async (sql: string, params: unknown[] = []) =>
    Number((await pool.query<{ n: string }>(sql, params)).rows[0]?.n);

  const totals = async () => ({
    songs: await count("select count(*) n from song_lists.songs"),
    artists: await count("select count(*) n from song_lists.artists"),
    productions: await count("select count(*) n from song_lists.productions"),
  });

  const input = (overrides: Partial<CreateInput>): CreateInput => ({
    artist: { kind: "new", name: "Zz Test Band" },
    title: "Zz Test Song",
    featuredArtists: [],
    production: null,
    cover: null,
    listIds: [],
    advocateUserIds: [],
    ...overrides,
  });

  describe("who may add one", () => {
    it("should refuse someone who isn't signed in, and add nothing", async () => {
      session.userId = null;
      const before = await totals();

      const result = await add.createSong(input({ title: "Zz Signed Out" }));

      expect(result).toEqual({
        status: "error",
        message: "You must be signed in to add a song.",
      });
      expect(await totals()).toEqual(before);
    });
  });

  describe("a song with everything attached", () => {
    it("should create the song, its new artist, production, and original, and link them all", async () => {
      session.userId = al;
      const gloria = await artistId(pool, "Beck");

      const result = await add.createSong(
        input({
          artist: { kind: "new", name: "Zz Full Band" },
          title: "  Zz   Full   Song ",
          bio: "  It slaps.  ",
          featuredArtists: [
            { kind: "existing", id: gloria },
            { kind: "new", name: "Zz Guest Singer" },
          ],
          production: {
            kind: "new",
            name: "Zz Full Film",
            releaseYear: 1999,
            typeId: filmTypeId,
          },
          cover: {
            kind: "new",
            title: "Zz Original Song",
            artist: { kind: "new", name: "Zz Original Band" },
          },
          listIds: [masterId],
          advocateUserIds: [cliff, al],
        }),
      );

      if (result.status !== "created") {
        throw new Error(`Expected created, got ${JSON.stringify(result)}`);
      }

      const song = (
        await pool.query(
          `select s.title, s.bio, s.created_by, s.updated_by, a.name artist
           from song_lists.songs s join song_lists.artists a on a.id = s.artist_id
           where s.id = $1`,
          [result.songId],
        )
      ).rows[0];

      expect(song).toEqual({
        title: "Zz Full Song",
        bio: "It slaps.",
        created_by: al,
        updated_by: al,
        artist: "Zz Full Band",
      });

      const featured = await pool.query(
        `select a.name from song_lists.song_featured_artists f
         join song_lists.artists a on a.id = f.artist_id where f.song_id = $1`,
        [result.songId],
      );
      expect(featured.rows.map((row) => row.name).toSorted()).toEqual([
        "Beck",
        "Zz Guest Singer",
      ]);

      const production = await pool.query(
        `select p.name, p.release_year, p.created_by from song_lists.song_productions sp
         join song_lists.productions p on p.id = sp.production_id where sp.song_id = $1`,
        [result.songId],
      );
      expect(production.rows).toEqual([
        { name: "Zz Full Film", release_year: 1999, created_by: al },
      ]);

      const original = await pool.query(
        `select o.title, a.name artist from song_lists.song_covers c
         join song_lists.songs o on o.id = c.original_song_id
         join song_lists.artists a on a.id = o.artist_id where c.song_id = $1`,
        [result.songId],
      );
      expect(original.rows).toEqual([
        { title: "Zz Original Song", artist: "Zz Original Band" },
      ]);

      expect(
        await count(
          "select count(*) n from song_lists.list_songs where song_id = $1 and list_id = $2 and created_by = $3",
          [result.songId, masterId, al],
        ),
      ).toBe(1);
    });

    it("should make the creator an advocate once, alongside anyone else chosen", async () => {
      session.userId = al;

      const result = await add.createSong(
        input({
          title: "Zz Advocated Song",
          advocateUserIds: [al, cliff, cliff],
        }),
      );

      if (result.status !== "created") {
        throw new Error("Expected created");
      }

      const advocates = await pool.query<{ user_id: string }>(
        "select user_id from song_lists.song_advocates where song_id = $1",
        [result.songId],
      );

      expect(advocates.rows.map((row) => row.user_id).toSorted()).toEqual(
        [al, cliff].toSorted(),
      );
    });

    it("should create a new artist only once when it is named in two places", async () => {
      session.userId = al;

      const result = await add.createSong(
        input({
          artist: { kind: "new", name: "Zz Twice Named" },
          title: "Zz Twice Song",
          featuredArtists: [{ kind: "new", name: "Zz Twice Named" }],
          cover: {
            kind: "new",
            title: "Zz Twice Original",
            artist: { kind: "new", name: "Zz Twice Named" },
          },
        }),
      );

      expect(result.status).toBe("created");
      expect(
        await count(
          "select count(*) n from song_lists.artists where name = 'Zz Twice Named'",
        ),
      ).toBe(1);
    });

    it("should tie a new song to an artist and an original that already exist", async () => {
      session.userId = al;
      const artist = await artistId(pool, "Cowboy Junkies");
      const original = await songId(
        pool,
        "Me And The Devil Blues",
        "Robert Johnson",
      );

      const result = await add.createSong(
        input({
          artist: { kind: "existing", id: artist },
          title: "Zz Another Cover",
          cover: { kind: "existing", songId: original },
        }),
      );

      if (result.status !== "created") {
        throw new Error("Expected created");
      }

      expect(
        await count(
          "select count(*) n from song_lists.song_covers where song_id = $1 and original_song_id = $2",
          [result.songId, original],
        ),
      ).toBe(1);
    });
  });

  describe("a song that already exists", () => {
    it("should refuse the same title by the same artist, in any case, and add nothing", async () => {
      session.userId = al;
      const artist = await artistId(pool, "Joey Bada$$");
      const existing = await songId(pool, "Paper Trail$", "Joey Bada$$");
      const before = await totals();

      const result = await add.createSong(
        input({
          artist: { kind: "existing", id: artist },
          title: "paper trail$",
        }),
      );

      expect(result).toMatchObject({
        status: "duplicate",
        existing: {
          id: existing,
          title: "Paper Trail$",
          artistName: "Joey Bada$$",
        },
      });
      expect(await totals()).toEqual(before);
    });

    it("should report an exact and a near match to the form while it's being filled in", async () => {
      session.userId = al;
      const artist = await artistId(pool, "Joey Bada$$");

      expect(
        (
          await add.checkDuplicateSong({
            artistId: artist,
            title: "Paper Trail$",
          })
        ).exact?.title,
      ).toBe("Paper Trail$");
      expect(
        (
          await add.checkDuplicateSong({
            artistId: artist,
            title: "Paper Trails",
          })
        ).near?.title,
      ).toBe("Paper Trail$");
      expect(
        await add.checkDuplicateSong({ artistId: artist, title: "   " }),
      ).toEqual({ exact: null, near: null });
    });
  });

  describe("our house style for names", () => {
    it("should hold the song back until a name that breaks the style is fixed or waved through", async () => {
      session.userId = al;
      const before = await totals();

      const held = await add.createSong(
        input({
          artist: { kind: "new", name: "the zz pogues" },
          title: "Zz Style Song",
        }),
      );

      expect(held).toEqual({
        status: "style",
        issues: [
          expect.objectContaining({
            field: "artist",
            text: "the zz pogues",
            suggestion: "The Zz Pogues",
          }),
        ],
      });
      expect(await totals()).toEqual(before);

      const waved = await add.createSong(
        input({
          artist: { kind: "new", name: "the zz pogues" },
          title: "Zz Style Song",
          styleOverrides: ["the zz pogues"],
        }),
      );

      expect(waved.status).toBe("created");
      expect(
        await count(
          "select count(*) n from song_lists.artists where name = 'the zz pogues'",
        ),
      ).toBe(1);
    });

    it("should still hold back a different name that wasn't waved through", async () => {
      session.userId = al;

      const result = await add.createSong(
        input({
          artist: { kind: "new", name: "zz lower band" },
          title: "zz lower song",
          styleOverrides: ["zz lower band"],
        }),
      );

      expect(result).toMatchObject({
        status: "style",
        issues: [{ field: "title", suggestion: "Zz Lower Song" }],
      });
    });

    it("should leave names that already exist alone, whatever their style", async () => {
      session.userId = al;
      const artist = await artistId(pool, "Joey Bada$$");

      const result = await add.createSong(
        input({
          artist: { kind: "existing", id: artist },
          title: "Zz Existing Artist Song",
        }),
      );

      expect(result.status).toBe("created");
    });
  });

  describe("when something goes wrong part way", () => {
    it("should add nothing at all, not even the artist created first", async () => {
      session.userId = al;
      const before = await totals();

      const result = await add.createSong(
        input({
          artist: { kind: "new", name: "Zz Rolled Back Band" },
          title: "Zz Rolled Back Song",
          production: {
            kind: "new",
            name: "Zz Rolled Back Film",
            releaseYear: 2001,
            typeId: filmTypeId,
          },
          listIds: [999_999],
        }),
      );

      expect(result.status).toBe("error");
      expect(await totals()).toEqual(before);
      expect(
        await count(
          "select count(*) n from song_lists.artists where name = 'Zz Rolled Back Band'",
        ),
      ).toBe(0);
    });

    it("should add nothing when the production's type doesn't exist", async () => {
      session.userId = al;
      const before = await totals();

      const result = await add.createSong(
        input({
          artist: { kind: "new", name: "Zz Bad Type Band" },
          title: "Zz Bad Type Song",
          production: {
            kind: "new",
            name: "Zz Bad Type Film",
            releaseYear: 2001,
            typeId: 999_999,
          },
        }),
      );

      expect(result.status).toBe("error");
      expect(await totals()).toEqual(before);
    });

    it("should refuse a blank title before touching anything", async () => {
      session.userId = al;
      const before = await totals();

      expect(await add.createSong(input({ title: "   " }))).toEqual({
        status: "error",
        message: "Title is required.",
      });
      expect(await totals()).toEqual(before);
    });
  });
});
