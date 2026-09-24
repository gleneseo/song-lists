import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./client.js";

/**
 * Absolute path to this package's migrations folder.
 *
 * Resolved from the module URL so it is correct whether the package is loaded
 * from source (tests, via the workspace `paths` mapping) or from `dist`
 */
const migrationsFolder = fileURLToPath(
  new URL("../migrations", import.meta.url),
);

/**
 * Applies every pending migration to `db`.
 *
 * Idempotent: drizzle tracks each applied migration's hash, so calling this
 * again on an up-to-date database is a no-op rather than a failure.
 * Intended for tests and local tooling that stand up a throwaway database;
 * production deploys run drizzle-kit against the same `migrations` folder
 */
function runMigrations(db: Database): Promise<void> {
  return migrate(db, { migrationsFolder });
}

export { migrationsFolder, runMigrations };
