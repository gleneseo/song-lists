import { describe, expect, it } from "vitest";
import { cleanAlbumName } from "../../src/album-name.js";

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
