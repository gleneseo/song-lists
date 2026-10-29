import { describe, expect, it } from "vitest";
import {
  cleanSongDetails,
  detailsToSave,
  EMPTY_SONG_DETAILS,
  sameSongDetails,
  type SongDetailsInput,
} from "@/lib/songs/song-details-input";

const NOW = new Date("2026-10-25T12:00:00Z");

const typed: SongDetailsInput = {
  albumName: "  Rhyme   Pays ",
  releaseYear: " 1987 ",
  artworkUrl: " https://example.test/art.jpg ",
  source: "itunes",
  sourceTrackId: " 123 ",
};

describe("cleanSongDetails", () => {
  it("should tidy what was typed into what is saved", () => {
    expect(cleanSongDetails(typed, NOW)).toEqual({
      status: "ok",
      details: {
        albumName: "Rhyme Pays",
        releaseYear: 1987,
        artworkUrl: "https://example.test/art.jpg",
        source: "itunes",
        sourceTrackId: "123",
      },
    });
  });

  it("should leave the curly quotes in an album's name alone", () => {
    const result = cleanSongDetails(
      { ...typed, albumName: "We Can’t Be Stopped" },
      NOW,
    );

    expect(result).toMatchObject({
      details: { albumName: "We Can’t Be Stopped" },
    });
  });

  it("should accept an album with no year, cover art, or source", () => {
    expect(
      cleanSongDetails(
        {
          albumName: "Rhyme Pays",
          releaseYear: "",
          artworkUrl: "",
          source: null,
          sourceTrackId: null,
        },
        NOW,
      ),
    ).toEqual({
      status: "ok",
      details: {
        albumName: "Rhyme Pays",
        releaseYear: null,
        artworkUrl: null,
        source: null,
        sourceTrackId: null,
      },
    });
  });

  it("should accept a year with no album", () => {
    expect(cleanSongDetails({ ...typed, albumName: "  " }, NOW)).toMatchObject({
      status: "ok",
      details: { albumName: null },
    });
  });

  it("should ask for an album or a year when it has neither", () => {
    expect(
      cleanSongDetails({ ...typed, albumName: "", releaseYear: "" }, NOW),
    ).toEqual({
      status: "error",
      message: "Give the album a name or a year, or leave the details out.",
    });
  });

  it.each(["87", "19x7", "1799", "2028", "1987.5"])(
    "should refuse the year %s",
    (releaseYear) => {
      expect(cleanSongDetails({ ...typed, releaseYear }, NOW)).toMatchObject({
        status: "error",
        message: expect.stringContaining("The year must be four digits"),
      });
    },
  );

  it("should accept next year, for an album that is announced", () => {
    expect(
      cleanSongDetails({ ...typed, releaseYear: "2027" }, NOW),
    ).toMatchObject({ status: "ok", details: { releaseYear: 2027 } });
  });

  it.each([
    "not an address",
    "ftp://example.test/a.jpg",
    "javascript:alert(1)",
    "/other/a.jpg",
    "/album-art/sub/a.jpg",
    "/album-art/../a.jpg",
    "/album-art/a.gif",
    "/album-art/",
  ])("should refuse the cover art address %s", (artworkUrl) => {
    expect(cleanSongDetails({ ...typed, artworkUrl }, NOW)).toEqual({
      status: "error",
      message:
        "The cover art address must be a web address starting with http:// or https://, or a local image such as /album-art/name.jpg.",
    });
  });

  it("should accept a plain http cover art address", () => {
    expect(
      cleanSongDetails(
        { ...typed, artworkUrl: "http://example.test/a.jpg" },
        NOW,
      ),
    ).toMatchObject({ details: { artworkUrl: "http://example.test/a.jpg" } });
  });

  it.each(["/album-art/band-album-1999.jpg", "/album-art/a.PNG"])(
    "should accept the local cover art image %s",
    (artworkUrl) => {
      expect(cleanSongDetails({ ...typed, artworkUrl }, NOW)).toMatchObject({
        details: { artworkUrl },
      });
    },
  );

  it("should drop a source it doesn't know, and the track ID with it", () => {
    expect(
      cleanSongDetails({ ...typed, source: "somewhere-else" }, NOW),
    ).toMatchObject({ details: { source: null, sourceTrackId: null } });
  });

  it("should drop the track ID when there is no source", () => {
    expect(
      cleanSongDetails({ ...typed, source: null, sourceTrackId: "123" }, NOW),
    ).toMatchObject({ details: { source: null, sourceTrackId: null } });
  });

  it("should keep a source with no track ID as having none", () => {
    expect(
      cleanSongDetails({ ...typed, sourceTrackId: null }, NOW),
    ).toMatchObject({ details: { source: "itunes", sourceTrackId: null } });
  });

  it("should use today's date to bound the year when none is given", () => {
    expect(cleanSongDetails({ ...typed, releaseYear: "1987" })).toMatchObject({
      status: "ok",
    });
  });
});

describe("detailsToSave", () => {
  it("should send the details for a song that had none", () => {
    expect(detailsToSave(typed)).toBe(typed);
  });

  it("should send nothing when no album or year was given", () => {
    expect(detailsToSave({ ...EMPTY_SONG_DETAILS, albumName: "  " })).toBe(
      undefined,
    );
  });

  it("should send nothing when the details are what the song already had", () => {
    expect(detailsToSave({ ...typed }, typed)).toBe(undefined);
  });

  it.each([
    ["album", { albumName: "Other" }],
    ["year", { releaseYear: "1988" }],
    ["cover art", { artworkUrl: "https://example.test/other.jpg" }],
  ])("should send the details when the %s was changed", (_, change) => {
    const changed = { ...typed, ...change };

    expect(detailsToSave(changed, typed)).toBe(changed);
  });

  it("should send nothing, rather than clear what a song had, when everything is blanked", () => {
    expect(detailsToSave(EMPTY_SONG_DETAILS, typed)).toBe(undefined);
  });
});

describe("sameSongDetails", () => {
  it("should find details the same when album, year, and cover art are", () => {
    expect(sameSongDetails(typed, { ...typed })).toBe(true);
  });

  it("should ignore stray spaces, and the service the details came from", () => {
    expect(
      sameSongDetails(typed, {
        ...typed,
        albumName: "Rhyme Pays",
        artworkUrl: "https://example.test/art.jpg",
        source: "musicbrainz",
        sourceTrackId: "other",
      }),
    ).toBe(true);
  });

  it.each([
    ["album", { albumName: "Other" }],
    ["year", { releaseYear: "1988" }],
    ["cover art", { artworkUrl: "https://example.test/other.jpg" }],
  ])("should find details different when the %s is", (_, change) => {
    expect(sameSongDetails(typed, { ...typed, ...change })).toBe(false);
  });

  it("should find two empty sets of details the same", () => {
    expect(sameSongDetails(EMPTY_SONG_DETAILS, EMPTY_SONG_DETAILS)).toBe(true);
  });
});
