import { describe, expect, it } from "vitest";
import { splitLinks } from "@/lib/text/split-links";

const text = (value: string) => ({ kind: "text", text: value });
const link = (url: string) => ({ kind: "link", url });

describe("splitLinks", () => {
  it("should leave text with no address as it is", () => {
    expect(splitLinks("Great live.")).toEqual([text("Great live.")]);
    expect(splitLinks("")).toEqual([]);
  });

  it("should pick out an address among words", () => {
    expect(
      splitLinks("Watch https://www.youtube.com/watch?v=abc123 -Al"),
    ).toEqual([
      text("Watch "),
      link("https://www.youtube.com/watch?v=abc123"),
      text(" -Al"),
    ]);
  });

  it("should find more than one address, http as well as https", () => {
    expect(splitLinks("http://a.test/x and https://b.test/y")).toEqual([
      link("http://a.test/x"),
      text(" and "),
      link("https://b.test/y"),
    ]);
  });

  it.each([
    ["See https://a.test/x.", "https://a.test/x", "."],
    ["(see https://a.test/x)", "https://a.test/x", ")"],
    ["https://a.test/x, then", "https://a.test/x", ", then"],
    ["Is it https://a.test/x?!", "https://a.test/x", "?!"],
  ])(
    "should leave punctuation after the address out of it: %s",
    (note, url, after) => {
      const parts = splitLinks(note);

      expect(parts).toContainEqual(link(url));
      expect(parts.at(-1)).toEqual(text(after));
    },
  );

  it("should keep a bracket that the address itself opens", () => {
    expect(splitLinks("https://en.wikipedia.org/wiki/Hurt_(song)")).toEqual([
      link("https://en.wikipedia.org/wiki/Hurt_(song)"),
    ]);
  });

  it("should not link other schemes or a bare scheme", () => {
    expect(splitLinks("javascript:alert(1) ftp://a.test https://")).toEqual([
      text("javascript:alert(1) ftp://a.test https://"),
    ]);
  });
});
