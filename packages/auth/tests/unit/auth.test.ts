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

  function build() {
    const handle = createDb({ connectionString: CONNECTION_STRING });
    pool = handle.pool;
    return createAuth(handle.db);
  }

  it("should build a Better Auth instance backed by the Drizzle adapter", () => {
    const auth = build();

    expect(typeof auth.handler).toBe("function");
    expect(auth.api).toBeDefined();
  });

  it("should apply the plural model names the schema uses", () => {
    const auth = build();

    expect(auth.options.user?.modelName).toBe("users");
    expect(auth.options.session?.modelName).toBe("sessions");
    expect(auth.options.account?.modelName).toBe("accounts");
    expect(auth.options.verification?.modelName).toBe("verifications");
  });
});
