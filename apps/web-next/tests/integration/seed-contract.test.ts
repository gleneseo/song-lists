import { LIST_EXTRA_COLUMN } from "@song-lists/db/list-extra-column";
import { USER_ROLE } from "@song-lists/db/user-role";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openAppDatabase } from "./support/app-database";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * The app leans on a few facts about the data the migrations seed, and
 * nothing else would notice if a migration quietly stopped providing one.
 */
describe("what the app expects of the seeded data", () => {
  let pool: Pool;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
  });

  afterAll(async () => {
    await pool.end();
  });

  const rows = async <T>(sql: string) => (await pool.query(sql)).rows as T[];

  it("should include the Master List the lists page defaults to", async () => {
    const { MASTER_LIST_NAME } = await import("@/lib/lists/list-view");

    expect(
      await rows(
        `select id from song_lists.lists where name = '${MASTER_LIST_NAME}'`,
      ),
    ).toHaveLength(1);
  });

  it("should give every list only columns the app knows how to show", async () => {
    const { parseExtraColumns } = await import("@/lib/lists/extra-columns");
    const lists = await rows<{ name: string; extra_columns: string[] }>(
      "select name, extra_columns from song_lists.lists",
    );

    for (const list of lists) {
      // A misspelled column would be dropped silently, so compare what's kept.
      expect(parseExtraColumns(list.extra_columns).toSorted()).toEqual(
        [...new Set(list.extra_columns)].toSorted(),
      );
      expect(
        list.extra_columns.every((column) =>
          (Object.values(LIST_EXTRA_COLUMN) as string[]).includes(column),
        ),
      ).toBe(true);
    }
  });

  it("should give every user a role the app understands", async () => {
    const found = await rows<{ role: string }>(
      "select distinct role from song_lists.users",
    );

    expect(
      found.every((user) =>
        (Object.values(USER_ROLE) as string[]).includes(user.role),
      ),
    ).toBe(true);
  });

  it("should make the System user an admin who can't sign in", async () => {
    const [system] = await rows<{ role: string; accounts: string }>(
      `select u.role, (select count(*) from song_lists.accounts a where a.user_id = u.id) accounts
       from song_lists.users u where u.id = '${SYSTEM_USER_ID}'`,
    );

    expect(system).toEqual({ role: "admin", accounts: "0" });
  });

  it("should seed Al as the admin and give everyone else a password they can sign in with", async () => {
    const people = await rows<{ name: string; role: string; accounts: string }>(
      `select u.name, u.role,
              (select count(*) from song_lists.accounts a
               where a.user_id = u.id and a.provider_id = 'credential' and a.password is not null) accounts
       from song_lists.users u where u.id <> '${SYSTEM_USER_ID}'`,
    );

    expect(people.filter((person) => person.role === "admin")).toEqual([
      expect.objectContaining({ name: "Al" }),
    ]);
    expect(
      people
        .filter((person) => person.role === "manager")
        .map((person) => person.name)
        .toSorted(),
    ).toEqual(["Chad", "Cliff", "Minnz", "Ryan", "Stuff"]);
    expect(people.every((person) => Number(person.accounts) === 1)).toBe(true);
  });

  it("should put an advocate on every song in the Master List", async () => {
    const { MASTER_LIST_NAME } = await import("@/lib/lists/list-view");
    const bare = await rows<{ title: string }>(
      `select s.title from song_lists.list_songs ls
       join song_lists.lists l on l.id = ls.list_id
       join song_lists.songs s on s.id = ls.song_id
       where l.name = '${MASTER_LIST_NAME}'
         and not exists (select 1 from song_lists.song_advocates sa where sa.song_id = s.id)`,
    );

    expect(bare).toEqual([]);
  });

  it("should not seed two songs with the same title by the same artist", async () => {
    expect(
      await rows(
        `select artist_id, lower(title) from song_lists.songs
         group by artist_id, lower(title) having count(*) > 1`,
      ),
    ).toEqual([]);
  });

  it("should seed a song's old comments as notes, one per line, leaving no bio behind", async () => {
    expect(
      await rows("select title from song_lists.songs where bio is not null"),
    ).toEqual([]);
    expect(
      await rows(
        `select n.body from song_lists.song_notes n
         join song_lists.songs s on s.id = n.song_id
         where s.title = 'Hit The Lights' order by n.id`,
      ),
    ).toEqual([
      { body: "REALLY? THE WHOLE ALBUM? -Al" },
      { body: "Yes, BECAUSE THAT WHOLE ALBUM SLAPS -Cliff" },
    ]);
  });

  it("should not seed two artists with the same name", async () => {
    expect(
      await rows(
        "select lower(name) from song_lists.artists group by lower(name) having count(*) > 1",
      ),
    ).toEqual([]);
  });

  it("should attribute every seeded row to a user who exists", async () => {
    // The foreign keys guarantee it; this fails loudly if one is ever dropped.
    for (const table of ["songs", "artists", "productions", "lists"]) {
      expect(
        await rows(
          `select t.id from song_lists.${table} t
           left join song_lists.users u on u.id = t.created_by
           where t.created_by is null or u.id is null`,
        ),
      ).toEqual([]);
    }
  });
});
