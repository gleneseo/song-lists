import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { USER_ROLE, UserRole } from "../../src/user-role.js";

const decode = Schema.decodeUnknownSync(UserRole);

describe("user role", () => {
  it("should accept every role it defines", () => {
    expect(Object.values(USER_ROLE).map((role) => decode(role))).toEqual([
      "user",
      "admin",
      "manager",
    ]);
  });

  it("should reject a value that is not one of its roles", () => {
    expect(() => decode("root")).toThrow(/user.*admin.*manager/);
  });

  it("should default new users to the least-privileged role", () => {
    expect(USER_ROLE.USER).toBe("user");
  });
});
