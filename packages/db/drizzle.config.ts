import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { defineConfig } from "drizzle-kit";

/**
 * Load the nearest `.env` on the way up from the current directory.
 *
 * drizzle-kit only auto-loads a `.env` from its own working directory, which
 * is `packages/db` when this runs via `npm run db:generate -w @song-lists/db`.
 * Walking up lets the single repo-root `.env` keep working, as it did before
 * this package moved out of the root. A `DATABASE_URL` already exported in the
 * environment wins, and `process.loadEnvFile` never overwrites it.
 */
function loadNearestEnv(): void {
  let directory = process.cwd();
  for (;;) {
    const candidate = join(directory, ".env");
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
    const parent = dirname(directory);
    if (parent === directory) {
      return;
    }
    directory = parent;
  }
}

if (!process.env["DATABASE_URL"]) {
  loadNearestEnv();
}

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const config = defineConfig({
  schema: "./src/schema/", // Picks up every schema file in the directory
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url: DATABASE_URL },
  strict: true, // Prompts for confirmation before running data-loss statements
  verbose: true, // Prints all SQL statements during migrations
});

export default config;
