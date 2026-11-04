import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openAppDatabase } from "./support/app-database";

describe("the sign-in limit, kept in the database", () => {
  let pool: Pool;
  let handler: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    const { createAuth, authConfig } = await import("@song-lists/auth");
    const { db } = await import("@/lib/queries/client");
    // Better Auth only limits requests in production; switch it on here.
    const auth = createAuth(db, {
      baseURL: "http://localhost:3000",
      rateLimit: { ...authConfig.rateLimit, enabled: true },
    });

    handler = auth.handler;
  });

  afterAll(async () => {
    await pool.end();
  });

  const signIn = (address: string) =>
    handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": address,
        },
        body: JSON.stringify({
          email: "nobody@example.com",
          password: "not the password",
        }),
      }),
    );

  it("should stop an address that signs in too often, and remember it in the database", async () => {
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 5; attempt++) {
      statuses.push((await signIn("203.0.113.7")).status);
    }

    expect(statuses.at(-1)).toBe(429);
    const { rows } = await pool.query<{ count: number }>(
      "select count from song_lists.rate_limits where key like '203.0.113.7%'",
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("should not stop a different address", async () => {
    expect((await signIn("203.0.113.99")).status).not.toBe(429);
  });
});
