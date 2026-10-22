import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chooseMatch, simplify } from "../../src/match.js";

const sample = (
  JSON.parse(
    readFileSync(
      new URL("../fixtures/itunes-seed-sample.json", import.meta.url),
      "utf8",
    ),
  ) as {
    title: string;
    artistName: string;
    results: {
      trackName: string;
      artistName: string;
      collectionName: string | null;
      releaseDate: string | null;
    }[];
  }[]
).map((song) => ({
  ...song,
  results: song.results.map((result) => ({
    title: result.trackName,
    artistName: result.artistName,
    albumName: result.collectionName,
    releaseYear: result.releaseDate
      ? Number(result.releaseDate.slice(0, 4))
      : null,
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

  it("should refuse an instrumental or live take when that is all there is", () => {
    const instrumental = {
      title: "Hold On Loosely (Instrumental)",
      artistName: ".38 Special",
    };
    const live = { title: "Hold On Loosely - Live", artistName: ".38 Special" };
    const concert = { ...exact, albumName: "Live at the Roxy" };

    expect(chooseMatch(wanted, [instrumental])).toBeNull();
    expect(chooseMatch(wanted, [live])).toBeNull();
    expect(chooseMatch(wanted, [concert])).toBeNull();
  });

  it("should refuse a track on an instrumentals album", () => {
    const album = { ...exact, albumName: "Wild-Eyed (Instrumentals)" };

    expect(chooseMatch(wanted, [album])).toBeNull();
  });

  it("should take a live recording that came out before any other release", () => {
    const concert = {
      ...exact,
      albumName: "Live at the Roxy",
      releaseYear: 1964,
    };
    const studio = {
      ...exact,
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 1981,
    };

    expect(chooseMatch(wanted, [studio, concert])).toBe(concert);
  });

  it("should not take a live recording that came out after another release", () => {
    const concert = {
      ...exact,
      albumName: "Live at the Roxy",
      releaseYear: 2006,
    };
    const studio = {
      ...exact,
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 1981,
    };
    const unknown = { ...exact, albumName: "Wild-Eyed Southern Boys" };

    expect(chooseMatch(wanted, [concert, studio])).toBe(studio);
    expect(chooseMatch(wanted, [concert, unknown])).toBe(unknown);
  });

  it("should take the earliest of several live recordings when it came out long before the rest", () => {
    const original = {
      ...exact,
      albumName: "At the Roxy (Live)",
      releaseYear: 1964,
    };
    const reissue = { ...exact, albumName: "Live in Paris", releaseYear: 1995 };

    expect(chooseMatch(wanted, [reissue, original])).toBe(original);
  });

  it("should not prefer an old live recording to a studio one whose year isn't known", () => {
    const studio = { ...exact, albumName: "Wild-Eyed Southern Boys" };
    const old = {
      ...exact,
      albumName: "At the Roxy (Live)",
      releaseYear: 1964,
    };
    const later = { ...exact, albumName: "Live in Paris", releaseYear: 1995 };

    expect(chooseMatch(wanted, [old, later, studio])).toBe(studio);
  });

  it("should refuse live recordings that came out around the same time, or alone", () => {
    const first = { ...exact, albumName: "Live in Chicago", releaseYear: 2004 };
    const second = { ...exact, albumName: "Live in Dallas", releaseYear: 2006 };
    const unknown = { ...exact, albumName: "Live in Paris" };

    expect(chooseMatch(wanted, [first, second])).toBeNull();
    expect(chooseMatch(wanted, [first])).toBeNull();
    expect(chooseMatch(wanted, [first, unknown])).toBeNull();
  });

  it("should not take a live recording whose year isn't known against one that is", () => {
    const concert = { ...exact, albumName: "Live at the Roxy" };
    const studio = { ...exact, albumName: "Wild-Eyed", releaseYear: 1981 };

    expect(chooseMatch(wanted, [concert, studio])).toBe(studio);
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

  it.each([
    "Greatest Hits",
    "The Best of Classic Rock",
    "His Best",
    "The Essential .38 Special",
    "The Complete A & B Sides",
    "Anthology: The Sounds of Science",
    "Made in California (1962–2012)",
    "The Chess Masters, 1955-1958",
    "Music From and Inspired By the Motion Picture",
    "Permanent Record: Al In The Box",
    "Master of Puppets (Deluxe Box Set)",
    "Behind Closed Doors: The Rarities",
    "Play & Play: B-Sides",
    "The Mercer St. Sessions 1972 (Demos)",
    "The Vault",
  ])("should prefer a song on an album of its own to one on %s", (name) => {
    const compilation = { ...exact, albumName: name };
    const album = { ...exact, albumName: "Wild-Eyed Southern Boys" };

    expect(chooseMatch(wanted, [compilation, album])).toBe(album);
  });

  it("should count a soundtrack as an album of its own, since it's where a film's song first came out", () => {
    const compilation = { ...exact, albumName: "Greatest Hits" };
    const soundtrack = {
      ...exact,
      albumName: "Back to the Future (Original Motion Picture Soundtrack)",
    };

    expect(chooseMatch(wanted, [compilation, soundtrack])).toBe(soundtrack);
    expect(chooseMatch(wanted, [soundtrack, exact])).toBe(soundtrack);
  });

  it.each([
    "Live",
    "Drop the Bomb (Live)",
    "Alive [Live in Paris]",
    "Live at the Roxy",
  ])("should prefer a studio album to %s", (name) => {
    const concert = { ...exact, albumName: name };
    const album = { ...exact, albumName: "Wild-Eyed Southern Boys" };

    expect(chooseMatch(wanted, [concert, album])).toBe(album);
  });

  it("should not take a studio album called Live From somewhere for a concert recording", () => {
    const album = { ...exact, albumName: "Live from the End of the World" };

    expect(chooseMatch(wanted, [album])).toBe(album);
  });

  it("should not take an album with live in its name for a concert recording", () => {
    const album = { ...exact, albumName: "Live Through This" };
    const compilation = { ...exact, albumName: "Greatest Hits" };

    expect(chooseMatch(wanted, [compilation, album])).toBe(album);
  });

  it("should not mind a live album when a live recording was asked for", () => {
    const concert = { ...exact, albumName: "Live at the Roxy" };

    expect(
      chooseMatch({ ...wanted, title: "Hold On Loosely (Live)" }, [
        concert,
        { ...exact, albumName: "Wild-Eyed Southern Boys" },
      ]),
    ).toBe(concert);
  });

  it("should settle for a compilation when it is all there is", () => {
    const compilation = { ...exact, albumName: "The Best of Classic Rock" };

    expect(chooseMatch(wanted, [compilation])).toBe(compilation);
  });

  it("should not trade a clearly better match for a better album", () => {
    const compilation = { ...exact, albumName: "Greatest Hits" };
    const album = {
      title: "Hold On Loosleyy",
      artistName: ".38 Special",
      albumName: "Wild-Eyed Southern Boys",
    };

    expect(chooseMatch(wanted, [album, compilation])).toBe(compilation);
  });

  it("should prefer a better album when the matches are about equally close", () => {
    const compilation = { ...exact, albumName: "Greatest Hits" };
    const album = {
      title: "Hold On Loosel",
      artistName: ".38 Special",
      albumName: "Wild-Eyed Southern Boys",
    };

    expect(chooseMatch(wanted, [compilation, album])).toBe(album);
  });

  it("should prefer the earliest release, with an unknown year last", () => {
    const reissue = { ...exact, releaseYear: 2015 };
    const original = { ...exact, releaseYear: 1981 };
    const unknown = { ...exact, releaseYear: null };
    const unstated = { ...exact };

    expect(chooseMatch(wanted, [unknown, reissue, original, unstated])).toBe(
      original,
    );
    expect(chooseMatch(wanted, [unstated, unknown])).toBe(unstated);
  });

  it("should prefer the closer match, then the service's own order", () => {
    const typo = { title: "Hold On Loosley", artistName: ".38 Special" };
    const twin = { ...exact };

    expect(chooseMatch(wanted, [typo, exact])).toBe(exact);
    expect(chooseMatch(wanted, [twin, exact])).toBe(twin);
  });
});

describe("chooseMatch, for the same act written another way", () => {
  const song = (artistName: string, title = "Move") => ({ title, artistName });

  it("should ignore a nickname in quotes", () => {
    const candidate = song('Damian "Jr. Gong" Marley');

    expect(chooseMatch(song("Damian Marley"), [candidate])).toBe(candidate);
    expect(
      chooseMatch(song('"Weird Al" Yankovic'), [song("Weird Al Yankovic")]),
    ).not.toBeNull();
    expect(
      chooseMatch(song('"Weird Al" Yankovic'), [song('"Weird Al" Yankovic')]),
    ).not.toBeNull();
  });

  it("should not mind a missing or added the, anywhere in the name", () => {
    const candidate = song("Frankie Lymon & The Teenagers");

    expect(chooseMatch(song("Frankie Lymon & Teenagers"), [candidate])).toBe(
      candidate,
    );
  });

  it("should not mind a trailing band", () => {
    const candidate = song("Kenny Wayne Shepherd");

    expect(chooseMatch(song("Kenny Wayne Shepherd Band"), [candidate])).toBe(
      candidate,
    );
    expect(
      chooseMatch(song("Steve Miller Band"), [song("Steve Miller")]),
    ).not.toBeNull();
  });

  it("should keep a name that is only band", () => {
    expect(chooseMatch(song("Band"), [song("Band")])).not.toBeNull();
  });

  it("should still refuse a different act that shares a word with it", () => {
    expect(
      chooseMatch(song("The Miller Band"), [song("Steve Miller Band")]),
    ).toBeNull();
    expect(chooseMatch(song("Prince"), [song("Eden Prince")])).toBeNull();
  });

  it("should treat n and 'n' as and, in a title", () => {
    const candidate = song("Snoop Dogg", "Gin and Juice");

    expect(chooseMatch(song("Snoop Dogg", "Gin N Juice"), [candidate])).toBe(
      candidate,
    );
    expect(
      chooseMatch(song("Snoop Dogg", "Rock 'n' Roll"), [
        song("Snoop Dogg", "Rock & Roll"),
      ]),
    ).not.toBeNull();
  });
});

describe("chooseMatch, for a song by an act together with others", () => {
  const song = (artistName: string, title = "Skate") => ({
    title,
    artistName,
  });

  it("should accept a solo name that is part of the credit", () => {
    const credit = song("Silk Sonic, Bruno Mars & Anderson .Paak");

    expect(chooseMatch(song("Silk Sonic"), [credit])).toBe(credit);
    expect(
      chooseMatch(song("Orville Peck & Willie Nelson"), [
        song("Willie Nelson"),
      ]),
    ).not.toBeNull();
    expect(
      chooseMatch(song("Primus"), [song("Primus & Beavis and Butt-Head")]),
    ).not.toBeNull();
  });

  it("should accept a credit made of the same acts in another order or style", () => {
    expect(
      chooseMatch(song("Anderson .Paak x Silk Sonic"), [
        song("Silk Sonic & Anderson .Paak"),
      ]),
    ).not.toBeNull();
  });

  it("should want the title to be the same, not just close", () => {
    const credit = song("Silk Sonic & Bruno Mars", "Smoking Out the Windows");

    expect(
      chooseMatch(song("Silk Sonic", "Smokin Out the Window"), [credit]),
    ).toBeNull();
  });

  it("should refuse a credit that shares no act", () => {
    expect(
      chooseMatch(song("Silk Sonic"), [song("Bruno Mars & Anderson .Paak")]),
    ).toBeNull();
  });

  it("should prefer the act itself to one credited with others", () => {
    const alone = song("Silk Sonic");

    expect(
      chooseMatch(song("Silk Sonic"), [song("Silk Sonic & Bruno Mars"), alone]),
    ).toBe(alone);
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

  it("should choose the album a song first came out on, over a greatest-hits collection", () => {
    const album = (artistName: string, title: string) =>
      chosenFor(artistName, title)?.albumName;

    expect(album("2Pac", "How Do U Want It")).toBe("All Eyez On Me");
    expect(album("Black Flag", "Gimmie Gimmie Gimmie")).toBe("Damaged");
    expect(album("Eagles", "In The City")).toBe("The Long Run");
    expect(album("Morphine", "Thursday")).toBe("Cure for Pain");
    expect(album("Bo Diddley", "Bo Diddley")).toBe("Bo Diddley");
    expect(album("Cyndi Lauper", "The Goonies 'R' Good Enough")).toMatch(
      /Goonies/,
    );
  });

  it("should not end up on a compilation for any of the songs", () => {
    const compilation =
      /greatest hits|best of|anthology|essentials?|collection|\b\d{4}\s*[–-]\s*\d{2,4}\b/i;

    expect(
      choices.filter(({ chosen }) => compilation.test(chosen?.albumName ?? "")),
    ).toEqual([]);
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
