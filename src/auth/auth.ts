import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client.js";
import * as schema from "../db/schema/song-lists.js";
import authConfig from "./config.js";

const auth = betterAuth({
  ...authConfig,
  database: drizzleAdapter(db, {
    schema,
    provider: "pg",
    // Not usePlural: true here -- authConfig already renames every model to
    // its plural table name (e.g. modelName: "users"). Combining that with
    // usePlural double-pluralizes the lookup ("users" -> "userss") and the
    // adapter fails to find the table.
  }),
});

export default auth;
