import { createAuthClient } from "better-auth/react";

/**
 * The client-side Better Auth handle, for use from Client Components.
 *
 * It never touches the database or reads server-only secrets -- every call
 * is an HTTP request to the `/api/auth/[...all]` route, which is served by
 * the server-side instance in `./auth.ts`.
 */
const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

const { signIn, signUp, signOut, useSession } = authClient;

export { authClient, signIn, signUp, signOut, useSession };
