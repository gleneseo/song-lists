import { describe, expect, it } from "vitest";
import { paginate, parsePage } from "@/lib/dashboard/pagination";

describe("parsePage", () => {
  it.each([
    ["a missing value", undefined],
    ["an empty string", ""],
    ["zero", "0"],
    ["a negative number", "-3"],
    ["a decimal", "1.5"],
    ["text", "abc"],
    ["an empty list", []],
  ])("should fall back to page 1 for %s", (_label, raw) => {
    expect(parsePage(raw)).toBe(1);
  });

  it("should read a positive whole number", () => {
    expect(parsePage("4")).toBe(4);
  });

  it("should read the first value when the param is repeated", () => {
    expect(parsePage(["2", "9"])).toBe(2);
  });
});

describe("paginate", () => {
  it("should describe the first page of several", () => {
    expect(paginate(120, 1, 50)).toEqual({
      page: 1,
      pageCount: 3,
      offset: 0,
      limit: 50,
      from: 1,
      to: 50,
      hasPrevious: false,
      hasNext: true,
    });
  });

  it("should describe a short last page", () => {
    expect(paginate(120, 3, 50)).toMatchObject({
      page: 3,
      offset: 100,
      from: 101,
      to: 120,
      hasPrevious: true,
      hasNext: false,
    });
  });

  it("should clamp a page past the end back to the last page", () => {
    expect(paginate(120, 99, 50).page).toBe(3);
  });

  it("should treat an empty list as a single page with nothing on it", () => {
    expect(paginate(0, 1, 50)).toMatchObject({
      page: 1,
      pageCount: 1,
      from: 0,
      to: 0,
      hasPrevious: false,
      hasNext: false,
    });
  });

  it("should fit exactly one full page without a second", () => {
    expect(paginate(50, 1, 50)).toMatchObject({ pageCount: 1, hasNext: false });
  });
});
