import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDb, schema } from "@song-lists/db";
import { migrationsFolder } from "@song-lists/db/migrate";
import { getTableName, is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, inject } from "vitest";
import { databaseUri } from "./setup/postgres.js";

/** The tables the Drizzle schema declares, as the code sees them. */
const declaredTables = Object.values(schema).filter((value): boolean =>
  is(value, PgTable),
) as PgTable[];

/** How the database client turns a column's name in the schema into its name in the database. */
const snakeCase = (name: string) =>
  name.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

describe("the Drizzle schema and the migrations, which must describe the same database", () => {
  const postgres = inject("postgres");
  let pool: Pool;

  beforeAll(() => {
    ({ pool } = createDb({
      connectionString: databaseUri(
        postgres.connectionUri,
        postgres.templateDatabase,
      ),
    }));
  });

  afterAll(async () => {
    await pool.end();
  });

  const columnsOf = async (table: string) =>
    (
      await pool.query<{ column_name: string; is_nullable: string }>(
        `select column_name, is_nullable from information_schema.columns
         where table_schema = 'song_lists' and table_name = $1`,
        [table],
      )
    ).rows;

  it("should have a table in the database for every table the schema declares, and no others", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'song_lists'",
    );

    expect(rows.map((row) => row.table_name).toSorted()).toEqual(
      declaredTables.map((table) => getTableName(table)).toSorted(),
    );
  });

  it.each(declaredTables.map((table) => [getTableName(table), table] as const))(
    "should have the same columns, and the same nullability, in %s",
    async (name, table) => {
      const declared = getTableConfig(table).columns.map((column) => ({
        name: snakeCase(column.name),
        nullable: !column.notNull,
      }));
      const actual = (await columnsOf(name)).map((column) => ({
        name: column.column_name,
        nullable: column.is_nullable === "YES",
      }));
      const byName = (a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name);

      expect(actual.toSorted(byName)).toEqual(declared.toSorted(byName));
    },
  );

  it.each(declaredTables.map((table) => [getTableName(table), table] as const))(
    "should have the same foreign keys in %s",
    async (name, table) => {
      const { rows } = await pool.query<{ n: string }>(
        `select count(*) n from pg_constraint c
         join pg_class t on t.oid = c.conrelid
         join pg_namespace s on s.oid = t.relnamespace
         where c.contype = 'f' and s.nspname = 'song_lists' and t.relname = $1`,
        [name],
      );

      expect(Number(rows[0]?.n)).toBe(getTableConfig(table).foreignKeys.length);
    },
  );

  it("should have applied every migration the journal lists, and no more", async () => {
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };
    const { rows } = await pool.query<{ n: string }>(
      "select count(*) n from drizzle.__drizzle_migrations",
    );

    expect(journal.entries.length).toBeGreaterThan(0);
    expect(Number(rows[0]?.n)).toBe(journal.entries.length);
  });
});
