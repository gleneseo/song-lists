import { Pool } from "pg";
import { inject, vi } from "vitest";
import { createIsolatedDatabase } from "../../../../../tests/integration/support/isolated-database";

/**
 * Points the web app at a database of this test file's own -- a copy of the
 * migrated and seeded template -- and returns a pool for checking what it
 * did with plain SQL.
 *
 * The app reads its connection string from the environment when its database
 * module is first loaded, so call this before importing anything from
 * `@/lib` (use `await import(...)` inside `beforeAll`).
 */
async function openAppDatabase(): Promise<{ pool: Pool }> {
  const { connectionUri } = await createIsolatedDatabase(inject("postgres"));

  vi.stubEnv("DATABASE_URL", connectionUri);
  // What Better Auth needs to sign people in, as the real app has it.
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-secret-used-only-in-integration-tests",
  );
  // The app caches its client on `global` across hot reloads; don't let a
  // previous file's client, pointed at another database, be picked up.
  Reflect.deleteProperty(globalThis, "songListsDb");

  return { pool: new Pool({ connectionString: connectionUri }) };
}

/** A user's ID, by display name. */
async function userId(pool: Pool, name: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    "select id from song_lists.users where name = $1",
    [name],
  );
  const [row] = rows;

  if (!row) {
    throw new Error(`No user named ${name}`);
  }

  return row.id;
}

/** The ID of the one row `sql` finds, which is expected to find exactly one. */
async function onlyId(
  pool: Pool,
  sql: string,
  params: unknown[],
): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(sql, params);

  if (rows.length !== 1 || rows[0] === undefined) {
    throw new Error(
      `Expected one row for ${JSON.stringify(params)}, got ${rows.length}`,
    );
  }

  return rows[0].id;
}

/** A song's ID, by title and artist name. */
function songId(pool: Pool, title: string, artist: string): Promise<number> {
  return onlyId(
    pool,
    `select s.id from song_lists.songs s
     join song_lists.artists a on a.id = s.artist_id
     where s.title = $1 and a.name = $2`,
    [title, artist],
  );
}

/** An artist's ID, by name. */
function artistId(pool: Pool, name: string): Promise<number> {
  return onlyId(pool, "select id from song_lists.artists where name = $1", [
    name,
  ]);
}

/** A production's ID, by name and year. */
function productionId(
  pool: Pool,
  name: string,
  releaseYear: number,
): Promise<number> {
  return onlyId(
    pool,
    "select id from song_lists.productions where name = $1 and release_year = $2",
    [name, releaseYear],
  );
}

export { artistId, openAppDatabase, productionId, songId, userId };
