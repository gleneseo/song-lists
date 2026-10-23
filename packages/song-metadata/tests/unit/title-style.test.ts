import { describe, expect, it } from "vitest";
import { checkStyle } from "../../src/title-style.js";

describe("checkStyle", () => {
  it.each([
    "The Pogues",
    "Stone Roses",
    "A Tribe Called Quest",
    "Wonderful World",
    "(What A) Wonderful World",
    "U2",
    "AC/DC",
    "R.E.M.",
    "Guns N' Roses",
    "Rock 'N' Roll",
    "Don't Stop Believin'",
    "Who's Next",
    "O'Brien",
    "Mr. Brightside",
    "Wu-Tang Clan",
    "Anestesia/Pulling Teeth",
    "McCartney",
    "MacArthur",
    "DeBarge",
    "Patti LaBelle",
    "LeVert",
    "Force M.D.'s",
    "Quannum MCs",
    "Kramer vs. Kramer",
    "Dan Le Sac vs. Scroobius Pip",
    "School Anthem (aka Senioritis)",
    "School Anthem (Aka Senioritis)",
    "KRAMER VS KRAMER",
    "Most People Are DJs",
  ])("should accept %s", (text) => {
    expect(checkStyle(text)).toEqual({ ok: true });
  });

  it.each(["THE KINKS", "REM", "KISS", "ABBA", "DJ Shadow", "Run-DMC"])(
    "should allow the all-caps word in %s as an acronym",
    (text) => {
      expect(checkStyle(text)).toEqual({ ok: true });
    },
  );

  it.each(["10cc", "2Pac", "3rd Bass", "50 Cent", "#1", "99 Problems"])(
    "should leave a word that starts with a number alone in %s",
    (text) => {
      expect(checkStyle(text)).toEqual({ ok: true });
    },
  );

  it.each(["日本語", "Beyoncé", "Björk", "Sigur Rós"])(
    "should accept %s",
    (text) => {
      expect(checkStyle(text)).toEqual({ ok: true });
    },
  );

  it.each([
    ["the Pogues", "The Pogues"],
    ["the kinks", "The Kinks"],
    ["u2", "U2"],
    ["a tribe called quest", "A Tribe Called Quest"],
    ["Stone roses", "Stone Roses"],
    ["Wonderful world", "Wonderful World"],
    ["(what a) wonderful world", "(What A) Wonderful World"],
    ["Rock 'n' Roll", "Rock 'N' Roll"],
    ["wu-tang clan", "Wu-Tang Clan"],
    ["Tyler The Creator x A$AP Rocky", "Tyler The Creator X A$AP Rocky"],
  ])("should suggest %s be written %s", (text, suggestion) => {
    expect(checkStyle(text)).toEqual({ ok: false, suggestion });
  });

  it.each([
    ["ScHoolboy Q", "Schoolboy Q"],
    ["faKe Rapper With COOL stylez$", "Fake Rapper With COOL Stylez$"],
    ["iPhone", "Iphone"],
    ["fIREHOSE", "Firehose"],
    ["Dancing WIth Myself", "Dancing With Myself"],
    ["the kinKs", "The Kinks"],
    ["mOnEy", "Money"],
  ])(
    "should suggest the best guess for odd capitals: %s",
    (text, suggestion) => {
      expect(checkStyle(text)).toEqual({ ok: false, suggestion });
    },
  );

  it("should put right everything that is off in one suggestion", () => {
    expect(checkStyle("the whole Thing is bullshit Vs. mOnEy, kid")).toEqual({
      ok: false,
      suggestion: "The Whole Thing Is Bullshit vs. Money, Kid",
    });
  });

  it.each([
    ["Kramer Vs. Kramer", "Kramer vs. Kramer"],
    ["Kramer VS Kramer", "Kramer vs Kramer"],
    ["kramer vs. kramer", "Kramer vs. Kramer"],
    ["Vs Battles", "vs Battles"],
  ])("should always write vs in lowercase: %s", (text, suggestion) => {
    expect(checkStyle(text)).toEqual({ ok: false, suggestion });
  });

  it("should still fix an aka written with odd capitals", () => {
    expect(checkStyle("School Anthem (aKa Senioritis)")).toEqual({
      ok: false,
      suggestion: "School Anthem (Aka Senioritis)",
    });
  });

  it("should capitalize the right word when an emoji comes first", () => {
    expect(checkStyle("🎸 the kinks")).toEqual({
      ok: false,
      suggestion: "🎸 The Kinks",
    });
  });

  it("should suggest the best guess for odd capitals after an apostrophe", () => {
    expect(checkStyle("O'bRien")).toEqual({
      ok: false,
      suggestion: "O'Brien",
    });
  });

  describe("with $ and ! standing in for letters", () => {
    it.each([
      "Too $hort",
      "A$AP Rocky",
      "Ke$ha",
      "P!nk",
      "Joey Bada$$",
      "$uicideboy$",
      "Paper Trail$",
    ])("should accept %s", (text) => {
      expect(checkStyle(text)).toEqual({ ok: true });
    });

    it("should still fix the lowercase words around them", () => {
      expect(checkStyle("too $hort")).toEqual({
        ok: false,
        suggestion: "Too $hort",
      });
    });

    it("should not treat a dollar amount or ending punctuation as letters", () => {
      expect(checkStyle("$20 Bill")).toEqual({ ok: true });
      expect(checkStyle("Yahoo!")).toEqual({ ok: true });
      expect(checkStyle("Hey! You")).toEqual({ ok: true });
      expect(checkStyle("!!!")).toEqual({ ok: true });
    });
  });
});
