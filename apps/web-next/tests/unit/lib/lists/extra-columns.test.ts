import { describe, expect, it } from "vitest";
import {
  BASE_SORTS,
  parseExtraColumns,
  showsProductions,
  sortsFor,
} from "@/lib/lists/extra-columns";

describe("parseExtraColumns", () => {
  it("should keep the optional columns it knows", () => {
    expect(parseExtraColumns(["productions"])).toEqual(["productions"]);
  });

  it("should return nothing for a list with no optional columns", () => {
    expect(parseExtraColumns([])).toEqual([]);
  });

  it("should drop a name it doesn't know instead of trusting it", () => {
    expect(parseExtraColumns(["lyrics", "productions", ""])).toEqual([
      "productions",
    ]);
  });

  it("should collapse repeats to one", () => {
    expect(parseExtraColumns(["productions", "productions"])).toEqual([
      "productions",
    ]);
  });
});

describe("showsProductions", () => {
  it("should be true only when the list has switched productions on", () => {
    expect(showsProductions(["productions"])).toBe(true);
    expect(showsProductions([])).toBe(false);
  });
});

describe("sortsFor", () => {
  it("should offer just the standard sorts to a list with no optional columns", () => {
    expect(sortsFor([])).toEqual(["added", "addedBy", "title", "artist"]);
    expect(sortsFor([])).toBe(BASE_SORTS);
  });

  it("should add a production sort when the list shows productions", () => {
    expect(sortsFor(["productions"])).toEqual([
      "added",
      "addedBy",
      "title",
      "artist",
      "production",
    ]);
  });
});
