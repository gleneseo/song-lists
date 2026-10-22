import { describe, expect, it } from "vitest";
import { metadataCredit } from "@/lib/songs/metadata-credit";

describe("metadataCredit", () => {
  it("should credit MusicBrainz and the Cover Art Archive for what they found", () => {
    expect(metadataCredit("musicbrainz")).toBe(
      "MusicBrainz and the Cover Art Archive",
    );
  });

  it("should credit iTunes otherwise", () => {
    expect(metadataCredit("itunes")).toBe("iTunes");
    expect(metadataCredit(null)).toBe("iTunes");
  });
});
