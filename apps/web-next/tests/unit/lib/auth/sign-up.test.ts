import { afterEach, describe, expect, it, vi } from "vitest";
import { closedSignUpResponse, signUpAllowed } from "@/lib/auth/sign-up";

const post = (path: string) =>
  new Request(`http://localhost:3000${path}`, { method: "POST" });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signUpAllowed", () => {
  it("should be off when nothing is set", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGN_UP", undefined);

    expect(signUpAllowed()).toBe(false);
  });

  it("should be on only when the setting is exactly true", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGN_UP", "true");

    expect(signUpAllowed()).toBe(true);
  });

  it.each(["false", "", "TRUE", "1", "yes"])(
    "should stay off when the setting is %j",
    (value) => {
      vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGN_UP", value);

      expect(signUpAllowed()).toBe(false);
    },
  );
});

describe("closedSignUpResponse", () => {
  it("should refuse a sign-up request while sign-up is off, saying who to ask", async () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGN_UP", "false");

    const response = closedSignUpResponse(post("/api/auth/sign-up/email"));

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({
      message: "Sign-up is closed. Ask an admin to create your account.",
    });
  });

  it("should let a sign-up request through while sign-up is on", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGN_UP", "true");

    expect(closedSignUpResponse(post("/api/auth/sign-up/email"))).toBeNull();
  });

  it("should leave every other request alone while sign-up is off", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_SIGN_UP", "false");

    for (const path of [
      "/api/auth/sign-in/email",
      "/api/auth/sign-out",
      "/api/auth/get-session",
      "/api/auth/sign-upward",
    ]) {
      expect(closedSignUpResponse(post(path)), path).toBeNull();
    }
  });
});
