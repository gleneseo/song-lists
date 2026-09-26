import { createDb, type Database } from "@song-lists/db";

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

declare global {
  var songListsDb: Database | undefined;
}

// Next.js dev re-evaluates this module on every HMR reload; caching the
// client on `global` reuses the same pool instead of leaking a new one.
export const db =
  global.songListsDb ?? createDb({ connectionString: DATABASE_URL }).db;
global.songListsDb = db;
