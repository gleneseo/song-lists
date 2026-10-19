import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  LIST_EXTRA_COLUMN,
  ListExtraColumn,
} from "../../src/list-extra-column.js";

const decode = Schema.decodeUnknownSync(ListExtraColumn);

describe("list extra column", () => {
  it("should accept every optional column it defines", () => {
    expect(
      Object.values(LIST_EXTRA_COLUMN).map((column) => decode(column)),
    ).toEqual(["productions"]);
  });

  it("should reject a value that is not one of its optional columns", () => {
    expect(() => decode("lyrics")).toThrow(/productions/);
  });
});
