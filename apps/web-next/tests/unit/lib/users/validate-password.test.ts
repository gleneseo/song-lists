import { describe, expect, it } from "vitest";
import { generatePassword } from "@/lib/users/generate-password";
import { validatePassword } from "@/lib/users/validate-password";

describe("validatePassword", () => {
  it("should accept a password of 8 to 128 characters", () => {
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword("a".repeat(128))).toBeNull();
  });

  it("should reject one that is too short", () => {
    expect(validatePassword("1234567")).toBe(
      "Password must be at least 8 characters.",
    );
  });

  it("should reject one that is too long", () => {
    expect(validatePassword("a".repeat(129))).toBe(
      "Password must be at most 128 characters.",
    );
  });
});

describe("generatePassword", () => {
  it("should make a valid password of the requested length", () => {
    const password = generatePassword(20);

    expect(password).toHaveLength(20);
    expect(validatePassword(password)).toBeNull();
  });

  it("should not repeat itself", () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
