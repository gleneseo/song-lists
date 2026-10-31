import { describe, expect, it } from "vitest";
import {
  validateNewUser,
  type NewUserInput,
} from "@/lib/users/validate-new-user";

const valid: NewUserInput = {
  name: "  Zed   Person ",
  firstName: "Zed",
  lastName: "",
  email: " Zed@Example.COM ",
  role: "user",
  bio: "",
  password: "a long password",
};

describe("validateNewUser", () => {
  it("should tidy the profile and keep the password as typed", () => {
    expect(validateNewUser(valid)).toEqual({
      ok: true,
      fields: {
        name: "Zed Person",
        firstName: "Zed",
        lastName: null,
        email: "zed@example.com",
        role: "user",
        bio: null,
      },
      password: "a long password",
    });
  });

  it("should refuse a password that is too short", () => {
    expect(validateNewUser({ ...valid, password: "short" })).toEqual({
      ok: false,
      message: "Password must be at least 8 characters.",
    });
  });

  it("should refuse a missing name", () => {
    expect(validateNewUser({ ...valid, name: "  " })).toEqual({
      ok: false,
      message: "Name is required.",
    });
  });

  it("should refuse an email that isn't one", () => {
    expect(validateNewUser({ ...valid, email: "nope" }).ok).toBe(false);
  });

  it("should refuse a role that doesn't exist", () => {
    expect(validateNewUser({ ...valid, role: "owner" }).ok).toBe(false);
  });
});
