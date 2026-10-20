import { describe, expect, it } from "vitest";
import { validateUserEdit } from "@/lib/users/validate-user-edit";

const valid = {
  name: "  Al   Rothschild ",
  firstName: " Al ",
  lastName: "",
  email: " Al@Example.COM ",
  role: "manager",
  bio: "  ",
};

describe("validateUserEdit", () => {
  it("should tidy the fields and blank the empty optional ones", () => {
    expect(validateUserEdit(valid)).toEqual({
      ok: true,
      fields: {
        name: "Al Rothschild",
        firstName: "Al",
        lastName: null,
        email: "al@example.com",
        role: "manager",
        bio: null,
      },
    });
  });

  it("should require a name", () => {
    expect(validateUserEdit({ ...valid, name: "  " })).toEqual({
      ok: false,
      message: "Name is required.",
    });
  });

  it.each(["", "nope", "a@b", "a b@c.com"])(
    "should reject the email %j",
    (email) => {
      expect(validateUserEdit({ ...valid, email })).toEqual({
        ok: false,
        message: "Enter a valid email address.",
      });
    },
  );

  it("should reject an unknown role", () => {
    expect(validateUserEdit({ ...valid, role: "root" })).toEqual({
      ok: false,
      message: "Choose a valid role.",
    });
  });
});
