import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/song-lists.js";

/**
 * Options for {@link createDb}.
 *
 * Pass a `connectionString` to have the client build and own a fresh pool, or
 * pass an existing `pool` to adopt one whose lifecycle the caller manages (for
 * example a test that shares a single pool across cases).
 */
type CreateDbOptions = { connectionString: string } | { pool: Pool };

function resolvePool(options: CreateDbOptions): Pool {
  return "pool" in options
    ? options.pool
    : new Pool({ connectionString: options.connectionString });
}

/**
 * Builds a Drizzle client bound to the song catalog schema.
 *
 * Nothing here reads `process.env`; each consuming app supplies its own
 * connection details so the package stays runtime-agnostic
 */
function createDb(options: CreateDbOptions) {
  const pool = resolvePool(options);
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool };
}

type Database = ReturnType<typeof createDb>["db"];

export { createDb };
export type { CreateDbOptions, Database };
