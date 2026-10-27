import { describe, expect, it } from "vitest";
import { prefixTsQuery } from "@/lib/search/prefix-tsquery";

describe("prefixTsQuery", () => {
  it("should match a single word as a prefix", () => {
    expect(prefixTsQuery("grease")).toBe("grease:*");
  });

  it("should require every word, in any order", () => {
    expect(prefixTsQuery("grease trav")).toBe("grease:* & trav:*");
  });

  it("should ignore extra whitespace", () => {
    expect(prefixTsQuery("  grease \t  travolta ")).toBe(
      "grease:* & travolta:*",
    );
  });

  it("should read symbols used as letters", () => {
    expect(prefixTsQuery("Too $hort")).toBe("Too:* & short:*");
    expect(prefixTsQuery("P!nk")).toBe("Pink:*");
  });

  it("should keep letters with accents and digits", () => {
    expect(prefixTsQuery("Beyoncé 99")).toBe("Beyoncé:* & 99:*");
  });

  it("should strip anything that could be read as a query operator", () => {
    expect(prefixTsQuery("a&b | ! (d) 'e' <-> f:*")).toBe(
      "ab:* & d:* & e:* & f:*",
    );
  });

  it("should give nothing back when nothing searchable is left", () => {
    expect(prefixTsQuery("")).toBeNull();
    expect(prefixTsQuery("   ")).toBeNull();
    expect(prefixTsQuery("%")).toBeNull();
    expect(prefixTsQuery("& | !")).toBeNull();
  });
});
