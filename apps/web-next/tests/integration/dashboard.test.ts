import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openAppDatabase, userId } from "./support/app-database";

describe("the dashboard queries, against the real schema and seed data", () => {
  let pool: Pool;
  let dashboard: typeof import("@/lib/queries/dashboard");
  let al: string;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    dashboard = await import("@/lib/queries/dashboard");
    al = await userId(pool, "Al");
  });

  afterAll(async () => {
    await pool.end();
  });

  const number = async (sql: string, params: unknown[] = []) =>
    Number((await pool.query<{ n: string }>(sql, params)).rows[0]?.n);

  describe("a person's own figures", () => {
    it("should total the songs they advocate, their artists, and their list additions", async () => {
      const stats = await dashboard.getUserStats(al);

      expect(stats.songsAdded).toBe(
        await number(
          "select count(*) n from song_lists.song_advocates where user_id = $1",
          [al],
        ),
      );
      expect(stats.artistsCovered).toBe(
        await number(
          `select count(distinct s.artist_id) n from song_lists.song_advocates sa
           join song_lists.songs s on s.id = sa.song_id where sa.user_id = $1`,
          [al],
        ),
      );
      expect(stats.listAdditions).toBe(
        await number(
          "select count(*) n from song_lists.list_songs where created_by = $1",
          [al],
        ),
      );
      expect(stats.listsContributedTo).toBe(
        await number(
          "select count(distinct list_id) n from song_lists.list_songs where created_by = $1",
          [al],
        ),
      );
      expect(stats.catalogSongs).toBe(
        await number("select count(*) n from song_lists.songs"),
      );
    });

    it("should give the first and last time they added a song, as real dates", async () => {
      const stats = await dashboard.getUserStats(al);

      expect(stats.firstAddedAt).toBeInstanceOf(Date);
      expect(stats.lastAddedAt).toBeInstanceOf(Date);
      expect(stats.firstAddedAt?.getTime()).toBeLessThanOrEqual(
        stats.lastAddedAt?.getTime() ?? 0,
      );
    });

    it("should report nothing, not an error, for someone who has added nothing", async () => {
      const stats = await dashboard.getUserStats(
        "11111111-1111-4111-8111-111111111111",
      );

      expect(stats).toMatchObject({
        songsAdded: 0,
        artistsCovered: 0,
        listAdditions: 0,
        firstAddedAt: null,
        lastAddedAt: null,
      });
    });

    it("should split their songs by the year they were added, adding back up to the total", async () => {
      const years = await dashboard.getUserYearlyActivity(al);
      const stats = await dashboard.getUserStats(al);

      expect(years.length).toBeGreaterThan(0);
      expect(years.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(
        stats.songsAdded,
      );
      expect(years.every((bucket) => Number.isInteger(bucket.year))).toBe(true);
    });

    it("should list their most recent additions, newest first, with the lists each is on", async () => {
      const history = await dashboard.getUserHistory(al, 8);

      expect(history).toHaveLength(8);
      expect(
        history.every(
          (entry, index) =>
            index === 0 ||
            (history[index - 1]?.addedAt.getTime() ?? 0) >=
              entry.addedAt.getTime(),
        ),
      ).toBe(true);
      expect(history.every((entry) => Array.isArray(entry.lists))).toBe(true);
      expect(history.every((entry) => entry.song.artist.name !== "")).toBe(
        true,
      );
    });

    it("should rank the artists they've added the most songs by", async () => {
      const top = await dashboard.getUserTopArtists(al, 5);
      const { rows } = await pool.query<{ n: string }>(
        `select count(*) n from song_lists.song_advocates sa
         join song_lists.songs s on s.id = sa.song_id
         where sa.user_id = $1 group by s.artist_id order by n desc limit 1`,
        [al],
      );

      expect(top).toHaveLength(5);
      expect(top[0]?.songCount).toBe(Number(rows[0]?.n));
      expect(
        top.every(
          (artist, index) =>
            index === 0 || (top[index - 1]?.songCount ?? 0) >= artist.songCount,
        ),
      ).toBe(true);
    });
  });

  describe("everyone's figures", () => {
    it("should count what each contributor added, leaving out the System user", async () => {
      const contributors = await dashboard.getContributors();
      const { rows } = await pool.query<{ user_id: string; n: string }>(
        `select user_id, count(*) n from song_lists.song_advocates
         where user_id <> '00000000-0000-0000-0000-000000000000' group by user_id`,
      );

      expect(contributors).toHaveLength(rows.length);

      for (const { user_id, n } of rows) {
        expect(contributors.find((c) => c.userId === user_id)?.count).toBe(
          Number(n),
        );
      }

      expect(contributors.map((c) => c.name)).not.toContain("System");
    });

    it("should show the newest songs on The Master List, newest first", async () => {
      const additions = await dashboard.getMasterListAdditions(10);
      const { rows } = await pool.query<{ id: number }>(
        `select s.id from song_lists.songs s
         where exists (
           select 1 from song_lists.list_songs ls
           join song_lists.lists l on l.id = ls.list_id
           where ls.song_id = s.id and l.name = 'The Master List')
         order by s.created_at desc, s.id desc limit 10`,
      );

      expect(additions.map((entry) => entry.song.id)).toEqual(
        rows.map((row) => row.id),
      );
    });

    it("should leave out a song that is on no list, as a cover's original is", async () => {
      const { rows: unlisted } = await pool.query<{ id: number }>(
        `select s.id from song_lists.songs s
         where not exists (
           select 1 from song_lists.list_songs ls
           join song_lists.lists l on l.id = ls.list_id
           where ls.song_id = s.id and l.name = 'The Master List')`,
      );
      const additions = await dashboard.getMasterListAdditions(100_000);

      expect(unlisted.length).toBeGreaterThan(0);
      expect(additions.map((entry) => entry.song.id)).not.toEqual(
        expect.arrayContaining([unlisted[0]?.id]),
      );
    });

    it("should pick the same song of the day for a whole day, and its lists and advocates", async () => {
      const morning = await dashboard.getSongOfTheDay(
        new Date("2026-03-04T01:00:00Z"),
      );
      const evening = await dashboard.getSongOfTheDay(
        new Date("2026-03-04T23:00:00Z"),
      );

      expect(morning?.song.id).toBe(evening?.song.id);

      const { rows } = await pool.query<{ name: string }>(
        `select u.name from song_lists.song_advocates sa
         join song_lists.users u on u.id = sa.user_id where sa.song_id = $1`,
        [morning?.song.id],
      );

      expect(morning?.advocates.toSorted()).toEqual(
        rows.map((row) => row.name).toSorted(),
      );
      expect(Array.isArray(morning?.lists)).toBe(true);
    });

    it("should pick different songs on different days", async () => {
      const days = await Promise.all(
        ["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07"].map((day) =>
          dashboard.getSongOfTheDay(new Date(`${day}T12:00:00Z`)),
        ),
      );

      expect(new Set(days.map((day) => day?.song.id)).size).toBeGreaterThan(1);
    });
  });
});
