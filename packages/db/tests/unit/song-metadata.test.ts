import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  SONG_METADATA_MATCHED_BY,
  SONG_METADATA_SOURCE,
  SONG_METADATA_STATUS,
  SongMetadataMatchedBy,
  SongMetadataSource,
  SongMetadataStatus,
} from "../../src/song-metadata.js";

describe("song metadata", () => {
  it("should accept every status it defines", () => {
    const decode = Schema.decodeUnknownSync(SongMetadataStatus);

    expect(Object.values(SONG_METADATA_STATUS).map((v) => decode(v))).toEqual([
      "matched",
      "not_found",
      "error",
    ]);
  });

  it("should reject a status that is not one of its own", () => {
    expect(() =>
      Schema.decodeUnknownSync(SongMetadataStatus)("pending"),
    ).toThrow(/matched.*not_found.*error/);
  });

  it("should accept every source it defines", () => {
    const decode = Schema.decodeUnknownSync(SongMetadataSource);

    expect(Object.values(SONG_METADATA_SOURCE).map((v) => decode(v))).toEqual([
      "itunes",
    ]);
  });

  it("should reject a source that is not one of its own", () => {
    expect(() =>
      Schema.decodeUnknownSync(SongMetadataSource)("napster"),
    ).toThrow(/itunes/);
  });

  it("should tell a lookup's pick from a person's choice", () => {
    const decode = Schema.decodeUnknownSync(SongMetadataMatchedBy);

    expect(
      Object.values(SONG_METADATA_MATCHED_BY).map((v) => decode(v)),
    ).toEqual(["auto", "manual"]);
    expect(() => decode("guess")).toThrow(/auto.*manual/);
  });
});
