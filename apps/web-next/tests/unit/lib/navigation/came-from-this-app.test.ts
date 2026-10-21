import { describe, expect, it } from "vitest";
import {
  cameFromThisApp,
  type Browser,
} from "@/lib/navigation/came-from-this-app";

const location = { origin: "https://songs.example.com" };

function browserWith(entries: (string | null)[], index: number): Browser {
  return {
    navigation: {
      currentEntry: { index },
      entries: () => entries.map((url) => ({ url })),
    },
    location,
    document: { referrer: "" },
  };
}

describe("cameFromThisApp", () => {
  it("should be true when the previous page is one of the app's own", () => {
    expect(
      cameFromThisApp(
        browserWith(
          [
            "https://songs.example.com/songs",
            "https://songs.example.com/songs/new",
          ],
          1,
        ),
      ),
    ).toBe(true);
  });

  it("should be false when the page was opened first in a new tab", () => {
    expect(
      cameFromThisApp(
        browserWith(
          ["chrome://newtab/", "https://songs.example.com/songs/new"],
          1,
        ),
      ),
    ).toBe(false);
  });

  it("should be false when the previous page is another site", () => {
    expect(
      cameFromThisApp(
        browserWith(
          [
            "https://elsewhere.example.org/",
            "https://songs.example.com/songs/new",
          ],
          1,
        ),
      ),
    ).toBe(false);
  });

  it("should be false when there is no earlier page at all", () => {
    expect(
      cameFromThisApp(browserWith(["https://songs.example.com/songs/new"], 0)),
    ).toBe(false);
  });

  it("should be false when the previous entry has no address", () => {
    expect(
      cameFromThisApp(
        browserWith([null, "https://songs.example.com/songs/new"], 1),
      ),
    ).toBe(false);
  });

  it("should treat a browser that can't say where it is as the start", () => {
    expect(
      cameFromThisApp({
        navigation: {
          currentEntry: null,
          entries: () => [{ url: "https://songs.example.com/x" }],
        },
        location,
        document: { referrer: "" },
      }),
    ).toBe(false);
  });

  describe("in a browser without the Navigation API", () => {
    it("should be true when the app sent the visitor here", () => {
      expect(
        cameFromThisApp({
          location,
          document: { referrer: "https://songs.example.com/songs" },
        }),
      ).toBe(true);
    });

    it("should be false when nothing, or another site, did", () => {
      expect(cameFromThisApp({ location, document: { referrer: "" } })).toBe(
        false,
      );
      expect(
        cameFromThisApp({
          location,
          document: { referrer: "https://elsewhere.example.org/songs" },
        }),
      ).toBe(false);
    });

    it("should not be fooled by an address that merely starts with the same text", () => {
      expect(
        cameFromThisApp({
          location,
          document: { referrer: "https://songs.example.com.evil.test/" },
        }),
      ).toBe(false);
    });
  });
});
