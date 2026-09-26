import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CONNECTION_STRING = "postgres://user:pass@localhost:5432/song_lists";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

describe("auth", () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.songListsDb = undefined;
    vi.stubEnv("DATABASE_URL", CONNECTION_STRING);
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-used-only-in-unit-tests");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await globalThis.songListsDb?.$client.end();
    globalThis.songListsDb = undefined;
  });

  it("should build a Better Auth instance bound to the app's shared database", async () => {
    const { auth } = await import("../../../../lib/auth/auth");

    expect(typeof auth.handler).toBe("function");
  });

  it("should validate callbacks and redirects against BETTER_AUTH_URL", async () => {
    const { auth } = await import("../../../../lib/auth/auth");

    expect(auth.options.baseURL).toBe("http://localhost:3000");
  });

  it("should read the current request's session from the request headers", async () => {
    const { auth, getSession } = await import("../../../../lib/auth/auth");
    const getSessionSpy = vi
      .spyOn(auth.api, "getSession")
      .mockResolvedValue(null);

    await getSession();

    expect(getSessionSpy).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });
});
