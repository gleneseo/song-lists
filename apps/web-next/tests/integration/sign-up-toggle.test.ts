import type { Pool } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { openAppDatabase } from "./support/app-database";

describe("public sign-up, switched by the environment", () => {
  let pool: Pool;
  let route: typeof import("@/app/api/auth/[...all]/route");

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    route = await import("@/app/api/auth/[...all]/route");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await pool.end();
  });

  const signUp = (email: string) =>
    route.POST(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Zz Newcomer",
          email,
          password: "a long password",
        }),
      }),
    );

  const userCount = async (email: string) =>
    Number(
      (
        await pool.query<{ n: string }>(
          "select count(*) n from song_lists.users where email = $1",
          [email],
        )
      ).rows[0]?.n,
    );

  it("should turn a sign-up away and create nobody when the setting isn't there", async () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGN_UP", undefined);

    const response = await signUp("zz.closed@example.com");

    expect(response.status).toBe(403);
    expect(await userCount("zz.closed@example.com")).toBe(0);
  });

  it("should let someone sign up when the setting is true", async () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGN_UP", "true");

    const response = await signUp("zz.open@example.com");

    expect(response.status).toBe(200);
    expect(await userCount("zz.open@example.com")).toBe(1);
  });
});
