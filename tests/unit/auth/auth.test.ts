import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://user:pass@localhost:5432/song_lists",
    );
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-used-only-in-unit-tests");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should build a Better Auth instance backed by the Drizzle adapter", async () => {
    const { auth } = await import("../../../src/auth/auth.js");

    expect(typeof auth.handler).toBe("function");
    expect(auth.api).toBeDefined();
  });

  it("should apply the plural model names auth configuration maps onto our schema", async () => {
    const { auth } = await import("../../../src/auth/auth.js");

    expect(auth.options.user?.modelName).toBe("users");
    expect(auth.options.session?.modelName).toBe("sessions");
    expect(auth.options.account?.modelName).toBe("accounts");
    expect(auth.options.verification?.modelName).toBe("verifications");
  });
});
