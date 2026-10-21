import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chooseMatch, simplify, type Candidate } from "../../src/match.js";

interface SampleSong {
  title: string;
  artistName: string;
  results: (Candidate & { trackId: number; trackName: string })[];
}

const sample = (
  JSON.parse(
    readFileSync(
      new URL("../fixtures/itunes-seed-sample.json", import.meta.url),
      "utf8",
    ),
  ) as (Omit<SampleSong, "results"> & {
    results: {
      trackName: string;
      artistName: string;
      collectionName: string;
    }[];
  })[]
).map((song) => ({
  ...song,
  results: song.results.map((result) => ({
    title: result.trackName,
    artistName: result.artistName,
    albumName: result.collectionName,
  })),
}));

const wanted = { title: "Hold On Loosely", artistName: ".38 Special" };
const exact = { title: "Hold On Loosely", artistName: ".38 Special" };

describe("simplify", () => {
  it("should ignore case, accents, and punctuation", () => {
    expect(simplify("Déjà Vu, Beyoncé!")).toBe("deja vu beyonce");
  });

  it("should ignore a trailing version label", () => {
    expect(simplify("Kaya (Remastered 2013)")).toBe("kaya");
    expect(simplify("Kaya [Bonus Track]")).toBe("kaya");
    expect(simplify("Kaya - 2021 Remaster")).toBe("kaya");
  });

  it("should treat an ampersand as the word and", () => {
    expect(simplify("Hall & Oates")).toBe(simplify("Hall and Oates"));
  });

  it("should keep a title that is nothing but a note in brackets", () => {
    expect(simplify("(Untitled)")).toBe("untitled");
  });

  it("should keep a name made only of symbols as it was written", () => {
    expect(simplify("!!!")).toBe("!!!");
  });
});

describe("chooseMatch", () => {
  it("should choose the song when title and artist agree", () => {
    expect(chooseMatch(wanted, [exact])).toBe(exact);
  });

  it("should not mind a differing label, article, or capitalization", () => {
    const candidate = {
      title: "HOLD ON LOOSELY (2021 Remaster)",
      artistName: "The .38 special",
    };

    expect(chooseMatch(wanted, [candidate])).toBe(candidate);
  });

  it("should accept a small typo in the title", () => {
    const candidate = { title: "Hold On Loosley", artistName: ".38 Special" };

    expect(chooseMatch(wanted, [candidate])).toBe(candidate);
  });

  it("should refuse a different song by the same artist", () => {
    expect(
      chooseMatch(wanted, [
        { title: "Caught Up in You", artistName: ".38 Special" },
      ]),
    ).toBeNull();
  });

  it("should refuse the same title by a different artist", () => {
    expect(
      chooseMatch(wanted, [
        { title: "Hold On Loosely", artistName: "Some Cover Act" },
      ]),
    ).toBeNull();
  });

  it("should give up when there is nothing to choose from", () => {
    expect(chooseMatch(wanted, [])).toBeNull();
  });

  it("should treat two empty titles as the same", () => {
    const candidate = { title: "", artistName: ".38 Special" };

    expect(chooseMatch({ ...wanted, title: "" }, [candidate])).toBe(candidate);
  });

  it("should refuse a tribute act, even for the right title", () => {
    expect(
      chooseMatch({ title: "The Thunder Rolls", artistName: "Garth Brooks" }, [
        { title: "The Thunder Rolls", artistName: "Garth Brooks Tribute" },
      ]),
    ).toBeNull();
  });

  it("should refuse a track from a tribute or karaoke album", () => {
    const candidates = [
      { ...exact, albumName: "A Tribute to .38 Special" },
      { ...exact, albumName: "Karaoke Hits (In the Style of .38 Special)" },
    ];

    expect(chooseMatch(wanted, candidates)).toBeNull();
  });

  it("should accept an act that is itself called a tribute when that is who we want", () => {
    const tribute = { title: "Hold On Loosely", artistName: "Fake Tribute" };

    expect(
      chooseMatch({ ...wanted, artistName: "Fake Tribute" }, [tribute]),
    ).toBe(tribute);
  });

  it("should accept a song whose own title says tribute", () => {
    const song = { title: "Tribute", artistName: "Tenacious D" };

    expect(chooseMatch(song, [{ ...song, albumName: "Tribute" }])).toEqual({
      ...song,
      albumName: "Tribute",
    });
  });

  it("should prefer a studio version to an instrumental or live one", () => {
    const instrumental = {
      title: "Hold On Loosely (Instrumental)",
      artistName: ".38 Special",
    };
    const live = { title: "Hold On Loosely - Live", artistName: ".38 Special" };

    expect(chooseMatch(wanted, [instrumental, live, exact])).toBe(exact);
  });

  it("should settle for an instrumental when it is all there is", () => {
    const instrumental = {
      title: "Hold On Loosely (Instrumental)",
      artistName: ".38 Special",
    };

    expect(chooseMatch(wanted, [instrumental])).toBe(instrumental);
  });

  it("should accept an instrumental when an instrumental was asked for", () => {
    const instrumental = {
      title: "Hold On Loosely (Instrumental)",
      artistName: ".38 Special",
    };

    expect(
      chooseMatch({ ...wanted, title: "Hold On Loosely (Instrumental)" }, [
        instrumental,
        exact,
      ]),
    ).toBe(instrumental);
  });

  it("should prefer the closer match, then the service's own order", () => {
    const typo = { title: "Hold On Loosley", artistName: ".38 Special" };
    const twin = { ...exact };

    expect(chooseMatch(wanted, [typo, exact])).toBe(exact);
    expect(chooseMatch(wanted, [twin, exact])).toBe(twin);
  });
});

describe("chooseMatch against real songs from the seed data", () => {
  const choices = sample.map((song) => ({
    song,
    chosen: chooseMatch(
      { title: song.title, artistName: song.artistName },
      song.results,
    ),
  }));
  const chosenFor = (artistName: string, title: string) =>
    choices.find(
      ({ song }) => song.artistName === artistName && song.title === title,
    )?.chosen;

  it("should match most of the songs", () => {
    const matched = choices.filter(({ chosen }) => chosen !== null);

    expect(choices).toHaveLength(120);
    expect(matched.length).toBeGreaterThanOrEqual(105);
  });

  it("should match songs found under a slightly different spelling", () => {
    expect(chosenFor("Blue Meanies", "It Doesn't Matter")).not.toBeNull();
    expect(
      chosenFor("Dave Matthews Band", "You Might Die Tryin"),
    ).not.toBeNull();
    expect(chosenFor("!!!", "So We Can Fuck")).not.toBeNull();
  });

  it("should never settle for another song or another act", () => {
    expect(chosenFor("Candlebox", "Cover Me")).toBeNull();
    expect(chosenFor("Hum", "The Pod")).toBeNull();
    expect(chosenFor("Hum", "Pinch And Roll")).toBeNull();
    expect(chosenFor("Diamond D", "Best Kept Secret")).toBeNull();
    expect(chosenFor("7L & Esoteric", "Call Me E.S.")).toBeNull();
    expect(chosenFor("Jay & The Americans", "Come A Bit Closer")).toBeNull();
  });

  it("should leave out a tribute act standing in for an artist who is not on the service", () => {
    expect(chosenFor("Garth Brooks", "The Thunder Rolls")).toBeNull();
  });

  it("should choose a song by the artist we asked for every time", () => {
    for (const { song, chosen } of choices) {
      if (chosen) {
        expect(simplify(chosen.artistName).replace(/^the /, "")).toContain(
          simplify(song.artistName).replace(/^the /, "").slice(0, 3),
        );
      }
    }
  });
});
