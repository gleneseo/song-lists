import { describe, expect, it } from "vitest";
import { youtubeSearchUrl } from "@/lib/songs/youtube-link";

describe("youtube link", () => {
  it("should search YouTube for the artist and the title", () => {
    const url = new URL(youtubeSearchUrl("Hold On Loosely", ".38 Special"));

    expect(url.origin + url.pathname).toBe("https://www.youtube.com/results");
    expect(url.searchParams.get("search_query")).toBe(
      ".38 Special Hold On Loosely",
    );
  });

  it("should keep characters that mean something in an address from changing the search", () => {
    const url = new URL(youtubeSearchUrl("Rock & Roll #1?", "Hall & Oates"));

    expect(url.searchParams.get("search_query")).toBe(
      "Hall & Oates Rock & Roll #1?",
    );
    expect([...url.searchParams.keys()]).toEqual(["search_query"]);
  });
});
