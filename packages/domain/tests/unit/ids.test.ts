import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Email, ResourceId } from "../../src/ids.js";

const decodeResourceId = Schema.decodeUnknownSync(ResourceId);
const decodeEmail = Schema.decodeUnknownSync(Email);

describe("ids", () => {
  it("should accept a UUID as a resource identifier", () => {
    const value = "0192f8b0-1c3e-7000-8000-000000000000";

    expect(decodeResourceId(value)).toBe(value);
  });

  it("should reject a resource identifier that is not a UUID", () => {
    expect(() => decodeResourceId("not-a-uuid")).toThrow(/UUID/);
  });

  it("should accept a plausible email address", () => {
    expect(decodeEmail("curator@example.com")).toBe("curator@example.com");
  });

  it("should reject a string that is not shaped like an email address", () => {
    expect(() => decodeEmail("curator@example")).toThrow(/RegExp/);
  });
});
