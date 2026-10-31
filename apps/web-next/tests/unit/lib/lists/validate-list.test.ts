import { describe, expect, it } from "vitest";
import { validateList } from "@/lib/lists/validate-list";

describe("validateList", () => {
  it("should tidy the name and keep the optional columns it knows", () => {
    expect(
      validateList({ name: "  Road   Trip ", extraColumns: ["productions"] }),
    ).toEqual({ ok: true, name: "Road Trip", extraColumns: ["productions"] });
  });

  it("should drop optional columns it doesn't know", () => {
    expect(
      validateList({ name: "Road Trip", extraColumns: ["lyrics"] }),
    ).toEqual({ ok: true, name: "Road Trip", extraColumns: [] });
  });

  it("should refuse a blank name", () => {
    expect(validateList({ name: "   ", extraColumns: [] })).toEqual({
      ok: false,
      message: "Name is required.",
    });
  });
});
