import add from "../../src/add.ts";
import { describe, expect, it } from "vitest";

describe("add", () => {
  it("should add two numbers", () => {
    const actual = add(1, 2);

    expect(actual).toBe(3);
  });
});
