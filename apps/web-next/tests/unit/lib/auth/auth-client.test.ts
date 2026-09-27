import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("auth-client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(null), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("should expose email sign-in, sign-up, sign-out, and session helpers", async () => {
    const { signIn, signUp, signOut, useSession } =
      await import("../../../../lib/auth/auth-client");

    expect(signIn.email).toBeTypeOf("function");
    expect(signUp.email).toBeTypeOf("function");
    expect(signOut).toBeTypeOf("function");
    expect(useSession).toBeTypeOf("function");
  });

  it("should send requests to the configured Better Auth base URL", async () => {
    const { signOut } = await import("../../../../lib/auth/auth-client");

    await signOut();

    const [requestUrl] = vi.mocked(fetch).mock.calls[0] ?? [];

    expect(String(requestUrl)).toBe("http://localhost:3000/api/auth/sign-out");
  });
});
