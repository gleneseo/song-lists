import { describe, expect, it } from "vitest";
import authConfig from "../../../src/auth/config.js";

describe("authConfig", () => {
  it("should identify the app to Better Auth", () => {
    expect(authConfig.appName).toBe("song-lists");
  });

  it("should support signing in with an email and password", () => {
    expect(authConfig.emailAndPassword?.enabled).toBe(true);
  });
});
