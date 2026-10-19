import { describe, expect, it } from "vitest";
import { formatPercent } from "@/lib/text/format-percent";

describe("formatPercent", () => {
  it("should round to a whole number", () => {
    expect(formatPercent(1, 3)).toBe("33%");
    expect(formatPercent(2, 3)).toBe("67%");
  });

  it("should show a full share as 100%", () => {
    expect(formatPercent(5, 5)).toBe("100%");
  });

  it("should show a tiny non-zero share as under 1% rather than 0%", () => {
    expect(formatPercent(1, 5667)).toBe("<1%");
  });

  it("should show nothing as 0%", () => {
    expect(formatPercent(0, 100)).toBe("0%");
  });

  it("should not divide by zero", () => {
    expect(formatPercent(3, 0)).toBe("0%");
  });
});
