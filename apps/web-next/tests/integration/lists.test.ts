import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openAppDatabase, userId } from "./support/app-database";

type Lists = typeof import("@/lib/queries/lists");

const view = (
  overrides: Partial<Parameters<Lists["getListEntries"]>[1]> = {},
): Parameters<Lists["getListEntries"]>[1] => ({
  query: "",
  sort: "title",
  direction: "asc",
  ...overrides,
});

describe("the list queries, against the real schema and seed data", () => {
  let pool: Pool;
  let lists: Lists;
  let masterId: number;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    lists = await import("@/lib/queries/lists");

    const master = (await lists.getLists()).find(
      (list) => list.name === "The Master List",
    );

    if (!master) {
      throw new Error("The seed should include The Master List");
    }

    masterId = master.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  const count = async (sql: string, params: unknown[] = []) => {
    const { rows } = await pool.query<{ n: string }>(sql, params);

    return Number(rows[0]?.n);
  };

  describe("the lists themselves", () => {
    it("should list every list, in the order they were created", async () => {
      const { rows } = await pool.query<{ id: number; name: string }>(
        "select id, name from song_lists.lists order by id",
      );

      expect(await lists.getLists()).toEqual(rows);
    });

    it("should summarize a list with its real size and the columns it shows", async () => {
      const summary = await lists.getListSummary(masterId);

      expect(summary).toMatchObject({ id: masterId, name: "The Master List" });
      expect(summary?.songCount).toBe(
        await count(
          "select count(*) n from song_lists.list_songs where list_id = $1",
          [masterId],
        ),
      );
      expect(Array.isArray(summary?.extraColumns)).toBe(true);
    });

    it("should give no summary for a list that doesn't exist", async () => {
      expect(await lists.getListSummary(999_999)).toBeNull();
    });

    it("should total each list's songs and how many one person added", async () => {
      const al = await userId(pool, "Al");
      const overview = await lists.getListsOverview(al);
      const master = overview.find((list) => list.id === masterId);

      expect(master?.songCount).toBe(
        await count(
          "select count(*) n from song_lists.list_songs where list_id = $1",
          [masterId],
        ),
      );
      expect(master?.yourSongCount).toBe(
        await count(
          "select count(*) n from song_lists.list_songs where list_id = $1 and created_by = $2",
          [masterId, al],
        ),
      );
      expect(overview.map((list) => list.id)).toEqual(
        (await lists.getLists()).map((list) => list.id),
      );
    });
  });

  describe("searching", () => {
    it("should count the whole list for an empty search", async () => {
      expect(await lists.countListEntries(masterId, "", [])).toBe(
        await count(
          "select count(*) n from song_lists.list_songs where list_id = $1",
          [masterId],
        ),
      );
    });

    it("should find an artist who spells a letter with a symbol by the plain letter", async () => {
      const expected = await count(
        `select count(*) n from song_lists.list_songs ls
         join song_lists.songs s on s.id = ls.song_id
         join song_lists.artists a on a.id = s.artist_id
         where ls.list_id = $1 and a.name = 'Too $hort'`,
        [masterId],
      );
      const entries = await lists.getListEntries(
        masterId,
        view({ query: "short", sort: "artist" }),
        [],
        0,
        500,
      );
      const byTooShort = entries.filter(
        (entry) => entry.song.artist.name === "Too $hort",
      );

      expect(expected).toBeGreaterThan(0);
      expect(byTooShort).toHaveLength(expected);
    });

    it.each(["$hort", "too short", "TOO $HORT"])(
      "should find the same songs for %s as for the artist's own spelling",
      async (query) => {
        const ids = async (q: string) =>
          (
            await lists.getListEntries(
              masterId,
              view({ query: q, sort: "artist" }),
              [],
              0,
              500,
            )
          )
            .filter((entry) => entry.song.artist.name === "Too $hort")
            .map((entry) => entry.id);

        expect(await ids(query)).toEqual(await ids("Too $hort"));
        expect((await ids(query)).length).toBeGreaterThan(0);
      },
    );

    it.each(["%", "_"])(
      "should treat %s in a search as that character, not as a pattern",
      async (character) => {
        const expected = await count(
          `select count(*) n from song_lists.list_songs ls
           join song_lists.songs s on s.id = ls.song_id
           join song_lists.artists a on a.id = s.artist_id
           where ls.list_id = $1
             and (strpos(s.title, $2) > 0 or strpos(a.name, $2) > 0)`,
          [masterId, character],
        );

        expect(await lists.countListEntries(masterId, character, [])).toBe(
          expected,
        );
        // A pattern would match everything; the character matches few or none.
        expect(expected).toBeLessThan(100);
      },
    );

    it("should count exactly the entries a search returns", async () => {
      const total = await lists.countListEntries(masterId, "love", []);
      const entries = await lists.getListEntries(
        masterId,
        view({ query: "love" }),
        [],
        0,
        total + 50,
      );

      expect(total).toBeGreaterThan(0);
      expect(entries).toHaveLength(total);
    });
  });

  describe("sorting", () => {
    // An independent statement of the sort order, for checking the app's: a
    // leading article moves to the end and "$" and "!" used as letters read as
    // the "s" and "i" they stand for.
    const sortKey = (column: string) =>
      `lower(regexp_replace(regexp_replace(regexp_replace(${column}, '\\$(?!\\d)', 's', 'g'), '!(?=\\w)', 'i', 'g'), '^(the|an|a|tha)\\s+(.+)$', '\\2, \\1', 'i'))`;
    const titleKey = sortKey("s.title");
    const artistKey = sortKey("a.name");

    const orderOf = async (sql: string, params: unknown[]) => {
      const { rows } = await pool.query<{ id: number }>(sql, params);

      return rows.map((row) => row.id);
    };

    it("should sort artists by their name without a leading article", async () => {
      const entries = await lists.getListEntries(
        masterId,
        view({ query: "stone", sort: "artist" }),
        [],
        0,
        500,
      );
      const wanted = [
        "The Rolling Stones",
        "The Stone Foxes",
        "The Stone Roses",
        "Stone Sour",
        "Stone Temple Pilots",
      ];
      const seen = [
        ...new Set(entries.map((entry) => entry.song.artist.name)),
      ].filter((name) => wanted.includes(name));

      expect(seen).toEqual(wanted);
    });

    it("should sort by the same order an independent query gives for artists", async () => {
      const entries = await lists.getListEntries(
        masterId,
        view({ sort: "artist" }),
        [],
        0,
        300,
      );
      const expected = await orderOf(
        `select ls.id from song_lists.list_songs ls
         join song_lists.songs s on s.id = ls.song_id
         join song_lists.artists a on a.id = s.artist_id
         where ls.list_id = $1
         order by ${artistKey},
                  ${titleKey}, ls.id
         limit 300`,
        [masterId],
      );

      expect(entries.map((entry) => entry.id)).toEqual(expected);
    });

    it.each(["asc", "desc"] as const)(
      "should sort titles %s, the same as an independent query",
      async (direction) => {
        const entries = await lists.getListEntries(
          masterId,
          view({ sort: "title", direction }),
          [],
          0,
          40,
        );
        const expected = await orderOf(
          `select ls.id from song_lists.list_songs ls
           join song_lists.songs s on s.id = ls.song_id
           where ls.list_id = $1
           order by ${titleKey} ${direction}, ls.id asc
           limit 40`,
          [masterId],
        );

        expect(entries.map((entry) => entry.id)).toEqual(expected);
      },
    );

    it("should show every advocate, comma separated, and sort by that text", async () => {
      const rio = await lists.getListEntries(
        masterId,
        view({ query: "Rio" }),
        [],
        0,
        50,
      );
      const duranDuran = rio.find(
        (entry) =>
          entry.song.title === "Rio" &&
          entry.song.artist.name === "Duran Duran",
      );
      expect(duranDuran?.addedBy).toBe("Al, Chad, Minnz, Stuff");

      const entries = await lists.getListEntries(
        masterId,
        view({ sort: "addedBy" }),
        [],
        0,
        400,
      );
      const expected = await orderOf(
        `select ls.id from song_lists.list_songs ls
         join song_lists.songs s on s.id = ls.song_id
         where ls.list_id = $1
         order by lower((select string_agg(u.name, ', ' order by lower(u.name), u.id)
                         from song_lists.song_advocates sa
                         join song_lists.users u on u.id = sa.user_id
                         where sa.song_id = s.id)) nulls last,
                  ${titleKey}, ls.id
         limit 400`,
        [masterId],
      );

      expect(entries.map((entry) => entry.id)).toEqual(expected);
    });

    it("should sort songs with no advocate last, whichever way", async () => {
      // Every seeded song has an advocate, so add one that doesn't.
      const al = await userId(pool, "Al");
      const { rows: artist } = await pool.query<{ id: number }>(
        "insert into song_lists.artists (name, created_by, updated_by) values ('Zz Nobody Backs Me', $1, $1) returning id",
        [al],
      );
      const { rows: song } = await pool.query<{ id: number }>(
        "insert into song_lists.songs (title, artist_id, created_by, updated_by) values ('Zz Unloved Song', $1, $2, $2) returning id",
        [artist[0]?.id, al],
      );
      await pool.query(
        "insert into song_lists.list_songs (list_id, song_id, created_by, updated_by) values ($1, $2, $3, $3)",
        [masterId, song[0]?.id, al],
      );

      const total = await lists.countListEntries(masterId, "", []);

      for (const direction of ["asc", "desc"] as const) {
        const last = await lists.getListEntries(
          masterId,
          view({ sort: "addedBy", direction }),
          [],
          total - 1,
          1,
        );

        expect(last[0]?.song.title).toBe("Zz Unloved Song");
        expect(last[0]?.addedBy).toBe("");
      }
    });
  });

  describe("paging", () => {
    it("should hand out consecutive pages with nothing repeated or skipped", async () => {
      const [first, second, both] = await Promise.all([
        lists.getListEntries(masterId, view(), [], 0, 25),
        lists.getListEntries(masterId, view(), [], 25, 25),
        lists.getListEntries(masterId, view(), [], 0, 50),
      ]);

      expect([...first, ...second].map((entry) => entry.id)).toEqual(
        both.map((entry) => entry.id),
      );
    });

    it("should return nothing past the end", async () => {
      const total = await lists.countListEntries(masterId, "", []);

      expect(
        await lists.getListEntries(masterId, view(), [], total, 10),
      ).toEqual([]);
    });
  });

  describe("a list that shows productions", () => {
    it("should load each song's productions, and sort by them", async () => {
      const { rows } = await pool.query<{ id: number }>(
        `select id from song_lists.lists where 'productions' = any(extra_columns) limit 1`,
      );
      const listId = rows[0]?.id;

      if (listId === undefined) {
        return;
      }

      const summary = await lists.getListSummary(listId);
      const entries = await lists.getListEntries(
        listId,
        view({ sort: "production" }),
        summary?.extraColumns ?? [],
        0,
        50,
      );

      expect(summary?.extraColumns).toContain("productions");
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((entry) => entry.productions.length > 0)).toBe(true);
    });
  });
});
