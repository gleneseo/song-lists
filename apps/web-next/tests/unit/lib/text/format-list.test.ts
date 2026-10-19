import { describe, expect, it } from "vitest";
import { formatList } from "../../../../lib/text/format-list";

describe("formatList", () => {
  it("should return an empty string for no items", () => {
    expect(formatList([])).toBe("");
  });

  it("should return the single item on its own", () => {
    expect(formatList(["Prince"])).toBe("Prince");
  });

  it("should join two items with an ampersand", () => {
    expect(formatList(["Prince", "Billy Gibbons"])).toBe(
      "Prince & Billy Gibbons",
    );
  });

  it("should comma-separate three or more items and use 'and' before the last", () => {
    expect(formatList(["Prince", "Billy Gibbons", "Dusty Hill"])).toBe(
      "Prince, Billy Gibbons and Dusty Hill",
    );
  });

  it("should not add an Oxford comma before the last item", () => {
    expect(
      formatList(["Prince", "Billy Gibbons", "Dusty Hill", "Frank Beard"]),
    ).toBe("Prince, Billy Gibbons, Dusty Hill and Frank Beard");
  });
});
