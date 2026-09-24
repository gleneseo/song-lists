import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Loads the nearest `.env` walking up from `startDir`, unless `DATABASE_URL`
 * is already set in the environment.
 *
 * Node tools (drizzle-kit, tsx) only auto-load a `.env` from their own
 * working directory, which is `packages/db` when a script runs via
 * `npm run <script> -w @song-lists/db`. Walking up lets the single
 * repo-root `.env` keep working. Returns the path it loaded, or `undefined`
 * if loading was skipped or no `.env` was found
 */
function loadNearestEnv(startDir: string): string | undefined {
  if (process.env["DATABASE_URL"]) {
    return undefined;
  }

  let directory = startDir;
  for (;;) {
    const candidate = join(directory, ".env");
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return candidate;
    }
    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
}

export { loadNearestEnv };
