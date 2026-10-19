import { describe, expect, it } from "vitest";
import { countLabel } from "@/lib/text/count-label";

describe("countLabel", () => {
  it("should use the singular for exactly one", () => {
    expect(countLabel(1, "song")).toBe("1 song");
  });

  it("should add an s for zero and for many", () => {
    expect(countLabel(0, "song")).toBe("0 songs");
    expect(countLabel(2, "song")).toBe("2 songs");
  });

  it("should group thousands", () => {
    expect(countLabel(5667, "song")).toBe("5,667 songs");
  });

  it("should accept an irregular plural", () => {
    expect(countLabel(3, "category", "categories")).toBe("3 categories");
  });
});
