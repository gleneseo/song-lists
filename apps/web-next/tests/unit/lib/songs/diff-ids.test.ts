import { describe, expect, it } from "vitest";
import { diffIds } from "../../../../lib/songs/diff-ids";

describe("diffIds", () => {
  it("should report nothing to do when the sets match", () => {
    expect(diffIds([1, 2], [2, 1])).toEqual({ toRemove: [], toAdd: [] });
  });

  it("should report IDs to remove and to add", () => {
    expect(diffIds([1, 2, 3], [2, 3, 4])).toEqual({
      toRemove: [1],
      toAdd: [4],
    });
  });

  it("should ignore duplicates in either input", () => {
    expect(diffIds([1, 1, 2], [2, 3, 3])).toEqual({
      toRemove: [1],
      toAdd: [3],
    });
  });

  it("should work with string IDs", () => {
    expect(diffIds(["a"], ["b"])).toEqual({ toRemove: ["a"], toAdd: ["b"] });
  });

  it("should remove everything when nothing is desired", () => {
    expect(diffIds([1, 2], [])).toEqual({ toRemove: [1, 2], toAdd: [] });
  });
});
