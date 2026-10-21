import { describe, expect, it } from "vitest";
import { validateEmail } from "@/lib/users/validate-email";

describe("validateEmail", () => {
  it("should accept an address and tidy it, trimmed and in lowercase", () => {
    expect(validateEmail("  Al@Example.COM ")).toEqual({
      ok: true,
      email: "al@example.com",
    });
  });

  it.each(["", "al", "al@example", "@example.com", "a l@example.com"])(
    "should reject %j as not an email address",
    (value) => {
      expect(validateEmail(value)).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    },
  );
});
