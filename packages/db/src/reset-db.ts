import { createDb } from "./client.js";
import { isLocalDatabase } from "./local-database.js";
import { loadNearestEnv } from "./load-env.js";
import { runMigrations } from "./migrate.js";

loadNearestEnv(process.cwd());

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

if (!isLocalDatabase(DATABASE_URL)) {
  throw new Error(
    "Refusing to reset a database that isn't on localhost. db:reset deletes every row.",
  );
}

/**
 * Throws away everything the migrations created -- the app schema and
 * Drizzle's record of which migrations ran -- then applies every migration
 * again. The database is left holding only what the migrations put there, so
 * anything added or changed while testing is gone. Extensions such as
 * pg_trgm are left installed; the migration that needs one re-enables it
 * idempotently.
 */
async function main(connectionString: string): Promise<void> {
  const { db, pool } = createDb({ connectionString });

  try {
    await db.execute("DROP SCHEMA IF EXISTS song_lists CASCADE");
    await db.execute("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await runMigrations(db);
    console.log(
      "Database reset: schema dropped and every migration reapplied.",
    );
  } finally {
    await pool.end();
  }
}

await main(DATABASE_URL);
