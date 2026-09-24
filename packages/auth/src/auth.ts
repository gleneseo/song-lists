import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { schema, type Database } from "@song-lists/db";
import authConfig from "./config.js";

/**
 * Builds a Better Auth instance bound to a caller-supplied database.
 *
 * The `db` handle comes from `@song-lists/db`'s `createDb`, so each app owns
 * its own connection. `overrides` is merged over the shared {@link authConfig}
 * base -- tests use it to pin `baseURL`, apps to set provider credentials.
 */
function createAuth(db: Database, overrides?: Partial<BetterAuthOptions>) {
  return betterAuth({
    ...authConfig,
    ...overrides,
    database: drizzleAdapter(db, {
      schema,
      provider: "pg",
      // Not usePlural: true here -- authConfig already renames every model to
      // its plural table name (e.g. modelName: "users"). Combining that with
      // usePlural double-pluralizes the lookup ("users" -> "userss") and the
      // adapter fails to find the table.
    }),
  });
}

export { createAuth };
