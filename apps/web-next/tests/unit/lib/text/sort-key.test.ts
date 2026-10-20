import { describe, expect, it } from "vitest";
import { byText, sortKey } from "@/lib/text/sort-key";

describe("sortKey", () => {
  it.each([
    ["The Stone Roses", "stone roses, the"],
    ["A Tribe Called Quest", "tribe called quest, a"],
    ["An Albatross", "albatross, an"],
    ["Tha Alkaholiks", "alkaholiks, tha"],
  ])("should move the leading article of %s to the end", (text, expected) => {
    expect(sortKey(text)).toBe(expected);
  });

  it("should ignore case, in the text and in the article", () => {
    expect(sortKey("THE stone ROSES")).toBe("stone roses, the");
  });

  it.each([
    ["Prince", "prince"],
    ["Another Brick In The Wall", "another brick in the wall"],
    ["Theory Of A Deadman", "theory of a deadman"],
    ["The", "the"],
    ["A", "a"],
    ["(What A) Wonderful World", "(what a) wonderful world"],
  ])("should leave %s where it is", (text, expected) => {
    expect(sortKey(text)).toBe(expected);
  });

  it("should only move the first article", () => {
    expect(sortKey("The The")).toBe("the, the");
    expect(sortKey("The A Team")).toBe("a team, the");
  });
});

describe("sortKey symbols", () => {
  it.each([
    ["Too $hort", "too short"],
    ["A$AP Rocky", "asap rocky"],
    ["Ke$ha", "kesha"],
    ["Joey Bada$$", "joey badass"],
    ["Paper Trail$", "paper trails"],
  ])("should read the dollar sign in %s as an s", (text, expected) => {
    expect(sortKey(text)).toBe(expected);
  });

  it("should leave a dollar sign before a number alone", () => {
    expect(sortKey("$20 Bill")).toBe("$20 bill");
    expect(sortKey("Pay $5 Now")).toBe("pay $5 now");
  });

  it.each([
    ["P!nk", "pink"],
    ["Oh!Oh", "ohioh"],
  ])("should read the exclamation point in %s as an i", (text, expected) => {
    expect(sortKey(text)).toBe(expected);
  });

  it.each([
    ["Yahoo!", "yahoo!"],
    ["Hey! You", "hey! you"],
    ["Panic! At The Disco", "panic! at the disco"],
    ["!!!", "!!!"],
    ["Wow!!", "wow!!"],
  ])("should leave the exclamation point in %s alone", (text, expected) => {
    expect(sortKey(text)).toBe(expected);
  });

  it("should still move a leading article once symbols are read as letters", () => {
    expect(sortKey("The $hins")).toBe("shins, the");
    expect(sortKey("A$AP")).toBe("asap");
  });
});

describe("byText", () => {
  it("should file names under the word after their article", () => {
    const sorted = [
      "The Stone Roses",
      "Tool",
      "A Tribe Called Quest",
      "Tha Alkaholiks",
      "Soundgarden",
      "Prince",
    ].toSorted(byText);

    expect(sorted).toEqual([
      "Tha Alkaholiks",
      "Prince",
      "Soundgarden",
      "The Stone Roses",
      "Tool",
      "A Tribe Called Quest",
    ]);
  });

  it("should file symbol spellings with their letters", () => {
    const sorted = [
      "Pixies",
      "P!nk",
      "Pink Floyd",
      "Too $hort",
      "Toto",
    ].toSorted(byText);

    expect(sorted).toEqual([
      "P!nk",
      "Pink Floyd",
      "Pixies",
      "Too $hort",
      "Toto",
    ]);
  });

  it("should treat equal keys as equal", () => {
    expect(byText("The Who", "the who")).toBe(0);
  });
});
