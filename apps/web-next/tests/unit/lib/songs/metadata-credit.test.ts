import { describe, expect, it } from "vitest";
import { metadataCredit } from "@/lib/songs/metadata-credit";

describe("metadataCredit", () => {
  it("should credit MusicBrainz and the Cover Art Archive for what they found", () => {
    expect(metadataCredit("musicbrainz")).toBe(
      "MusicBrainz and the Cover Art Archive",
    );
  });

  it("should credit iTunes for what it found", () => {
    expect(metadataCredit("itunes")).toBe("iTunes");
  });

  it("should credit no one when no service was behind the details", () => {
    expect(metadataCredit(null)).toBeNull();
  });
});
