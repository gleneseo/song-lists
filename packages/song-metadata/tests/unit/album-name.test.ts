import { describe, expect, it } from "vitest";
import { cleanAlbumName, tidyAlbumName } from "../../src/album-name.js";

describe("cleanAlbumName", () => {
  it.each([
    ["Insomniac (25th Anniversary Deluxe Edition)", "Insomniac"],
    ["Liquid Swords (Expanded Edition)", "Liquid Swords"],
    ["Rust In Peace (2004 Remix / Expanded Edition)", "Rust In Peace"],
    ["Sublime (Deluxe Edition)", "Sublime"],
    ["Odd Soul (Deluxe Version)", "Odd Soul"],
    ["Autoamerican (Bonus Track) [2001 Remaster]", "Autoamerican"],
    ["Waitress [Remastered]", "Waitress"],
    ["Operation: Doomsday (Complete)", "Operation: Doomsday"],
    ["Pleather (Reissue) - EP", "Pleather - EP"],
    ["Trompe le Monde (2026 Remaster)", "Trompe le Monde"],
    ["Thriller - Remastered", "Thriller"],
    ["Thriller - 2008 Remaster", "Thriller"],
    ["I Choose You (Formerly Blind over You)", "Blind over You"],
    ["Full Length LP [Formerly Known As: Slam (Deluxe Edition)]", "Slam"],
  ])("should drop the edition from %s", (name, cleaned) => {
    expect(cleanAlbumName(name)).toBe(cleaned);
  });

  it.each([
    "Dark Side of the Moon",
    "Live at the Roxy",
    "Stranger Things (Soundtrack from the Netflix Original Series)",
    "Jar of Flies - EP",
    "Hopeless Romantic - Single",
    "Songs (Live)",
    "Two Parts - Part One",
    "(Deluxe Edition)",
  ])("should leave %s alone", (name) => {
    expect(cleanAlbumName(name)).toBe(name);
  });

  it("should take off every edition note", () => {
    expect(cleanAlbumName("Nevermind (Remastered) (Deluxe Edition)")).toBe(
      "Nevermind",
    );
  });
});

describe("tidyAlbumName", () => {
  it.each([
    ["Mental Floss for the Globe", "Mental Floss For The Globe"],
    ["Insomniac (25th Anniversary Deluxe Edition)", "Insomniac"],
    ["Songs of Surrender (Deluxe)", "Songs Of Surrender"],
    ["Pleather (Reissue) - EP", "Pleather - EP"],
    ["I Choose You (Formerly Blind over You)", "Blind Over You"],
    ["Is This It", "Is This It"],
    ["Bringing it All Back Home", "Bringing It All Back Home"],
  ])("should save %s as %s", (name, tidy) => {
    expect(tidyAlbumName(name)).toBe(tidy);
  });

  it.each([
    "Kramer vs. Kramer",
    "AC/DC",
    "ScHoolboy Q",
    "iPhone Sessions",
    "nWo Wolfpac",
    "xx",
    "The xx Remixed",
    "Weezer (Green Album)",
    "thank u, next",
    "in rainbows",
    "McCartney II",
    "3rd Bass",
    "÷",
    "",
  ])("should leave %s as it is", (name) => {
    expect(tidyAlbumName(name)).toBe(name);
  });
});
