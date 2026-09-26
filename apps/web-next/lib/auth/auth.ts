import { headers } from "next/headers";
import { createAuth } from "@song-lists/auth";
import { db } from "@/lib/queries/client";

/**
 * The server-side Better Auth instance, bound to this app's database.
 *
 * Only safe to import from Server Components, Route Handlers, and other
 * server-only code -- it holds the Postgres connection and reads
 * `BETTER_AUTH_SECRET` from the environment. Client Components use
 * `./auth-client.ts` instead, which reaches this instance over HTTP through
 * the `/api/auth/[...all]` route rather than importing it directly.
 */
const auth = createAuth(db, { baseURL: process.env.BETTER_AUTH_URL });

/**
 * Reads the current request's session, or `null` when signed out.
 */
async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export { auth, getSession };
