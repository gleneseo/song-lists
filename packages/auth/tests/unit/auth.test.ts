import { createDb } from "@song-lists/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "../../src/auth.js";

const CONNECTION_STRING = "postgres://user:pass@localhost:5432/song_lists";

type Pool = ReturnType<typeof createDb>["pool"];

describe("auth", () => {
  let pool: Pool | undefined;

  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-used-only-in-unit-tests");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await pool?.end();
    pool = undefined;
  });

  function build(overrides?: Parameters<typeof createAuth>[1]) {
    const handle = createDb({ connectionString: CONNECTION_STRING });
    pool = handle.pool;
    const findFirst = vi.spyOn(handle.db.query.users, "findFirst");

    return { auth: createAuth(handle.db, overrides), findFirst };
  }

  /** Runs the hook that decides whether a new session may start. */
  function startSession(auth: ReturnType<typeof build>["auth"]) {
    return auth.options.databaseHooks.session.create?.before?.(
      { userId: "u1" } as never,
      null,
    );
  }

  it("should build a Better Auth instance backed by the Drizzle adapter", () => {
    const { auth } = build();

    expect(typeof auth.handler).toBe("function");
    expect(auth.api).toBeDefined();
  });

  it("should apply the plural model names the schema uses", () => {
    const { auth } = build();

    expect(auth.options.user?.modelName).toBe("users");
    expect(auth.options.session?.modelName).toBe("sessions");
    expect(auth.options.account?.modelName).toBe("accounts");
    expect(auth.options.verification?.modelName).toBe("verifications");
  });

  it("should refuse a new session for a deactivated user", async () => {
    const { auth, findFirst } = build();

    findFirst.mockResolvedValue({ deactivatedAt: new Date() } as never);

    await expect(startSession(auth)).rejects.toMatchObject({
      status: "FORBIDDEN",
      body: { message: "This account has been deactivated." },
    });
  });

  it.each([
    ["an active user", { deactivatedAt: null }],
    ["an unknown user", undefined],
  ])("should allow a new session for %s", async (_label, user) => {
    const { auth, findFirst } = build();

    findFirst.mockResolvedValue(user as never);

    await expect(startSession(auth)).resolves.toBeUndefined();
  });

  it("should keep database hooks supplied by the caller", () => {
    const { auth } = build({ databaseHooks: { user: {} } });

    expect(auth.options.databaseHooks.user).toEqual({});
    expect(auth.options.databaseHooks.session.create?.before).toBeTypeOf(
      "function",
    );
  });
});
