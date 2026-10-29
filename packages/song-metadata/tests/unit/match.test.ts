import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chooseMatch, isProperAlbum, simplify } from "../../src/match.js";

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

  it("should read a dollar sign as the letter s", () => {
    expect(simplify("Brand New Chanel$")).toBe("brand new chanels");
    expect(simplify("Joey Bada$$")).toBe(simplify("Joey Badass"));
  });

  it("should leave a dollar sign before a number as money", () => {
    expect(simplify("If I Had $1000000")).toBe("if i had 1000000");
  });

  it("should read an exclamation point inside a word as the letter i", () => {
    expect(simplify("P!nk")).toBe("pink");
    expect(simplify("Sk!n Deep")).toBe("skin deep");
  });

  it("should leave an exclamation point that ends a word as punctuation", () => {
    expect(simplify("Yahoo!")).toBe("yahoo");
    expect(simplify("Hey! You")).toBe("hey you");
    expect(simplify("!!!")).toBe("!!!");
  });

  it("should read an at sign beside a letter as the letter a", () => {
    expect(simplify("M@ke It Rain")).toBe("make it rain");
    expect(simplify("Cl@ss")).toBe("class");
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

  it("should read a word a source masks with symbols as the word it hides", () => {
    const candidate = { title: "F*!#In' Up", artistName: "Neil Young" };

    expect(
      chooseMatch({ title: "Fuckin' Up", artistName: "Neil Young" }, [
        candidate,
      ]),
    ).toBe(candidate);
  });

  it("should not read a masked word as one that starts with another letter", () => {
    expect(
      chooseMatch({ title: "Real Thing", artistName: "Pearl Jam" }, [
        { title: "S**l Thing", artistName: "Pearl Jam" },
      ]),
    ).toBeNull();
  });

  it("should accept a song that only came out on an instrumentals album", () => {
    const candidate = {
      title: "Wig Blows Off",
      artistName: "Tobacco",
      albumName: "Rarities (Instrumental Rarities & Unreleased Beats)",
    };

    expect(
      chooseMatch({ title: "Wig Blows Off", artistName: "Tobacco" }, [
        candidate,
      ]),
    ).toBe(candidate);
  });

  it("should refuse an instrumental of a song when the title says so", () => {
    expect(
      chooseMatch({ title: "Nightcrawler", artistName: "Czarface" }, [
        {
          title: "Nightcrawler (Instrumental)",
          artistName: "Czarface",
          albumName: "Heroes - Instrumentals",
        },
      ]),
    ).toBeNull();
  });

  it("should accept a title the service spells with a dollar sign for an s", () => {
    const candidate = { title: "brand new chanel$", artistName: "Slayyyter" };

    expect(
      chooseMatch({ title: "Brand New Chanels", artistName: "Slayyyter" }, [
        candidate,
      ]),
    ).toBe(candidate);
  });

  it("should accept an artist the service spells with a dollar sign for an s", () => {
    const candidate = { title: "Hold On Loosely", artistName: "Ke$ha" };

    expect(
      chooseMatch({ title: "Hold On Loosely", artistName: "Kesha" }, [
        candidate,
      ]),
    ).toBe(candidate);
  });

  it("should accept an artist the service spells with an exclamation point for an i", () => {
    const candidate = { title: "Hold On Loosely", artistName: "P!nk" };

    expect(
      chooseMatch({ title: "Hold On Loosely", artistName: "Pink" }, [
        candidate,
      ]),
    ).toBe(candidate);
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

  it("should prefer the song's own release to a track on an instrumentals album", () => {
    const album = { ...exact, albumName: "Wild-Eyed (Instrumentals)" };
    const original = { ...exact, albumName: "Wild-Eyed" };

    expect(chooseMatch(wanted, [album, original])).toBe(original);
  });

  it("should accept a track on an instrumentals album when it is all there is", () => {
    const album = { ...exact, albumName: "Wild-Eyed (Instrumentals)" };

    expect(chooseMatch(wanted, [album])).toBe(album);
  });

  it.each([
    ["Hold On Loosely (40th Anniversary Version)", "XL"],
    ["Hold On Loosely (Rerecorded)", "Greatest Hits Revisited"],
    ["Hold On Loosely (Re-Recorded)", "Wild-Eyed Southern Boys"],
    ["Hold On Loosely (Taylor's Version)", "Wild-Eyed Southern Boys"],
    ["Hold On Loosely", "Wild-Eyed Southern Boys (Re-Recorded Version)"],
    ["Hold On Loosely", "Morning View XXIII (Rerecorded Version)"],
  ])("should refuse a re-recorded take: %s on %s", (title, albumName) => {
    const remake = { ...exact, title, albumName, releaseYear: 2022 };
    const original = { ...exact, releaseYear: 1981 };

    expect(chooseMatch(wanted, [remake, original])).toBe(original);
    expect(chooseMatch(wanted, [remake])).toBeNull();
  });

  it("should not take an anniversary reissue of the album for a remake", () => {
    const reissue = {
      ...exact,
      albumName: "Wild-Eyed Southern Boys (40th Anniversary Deluxe Edition)",
    };

    expect(chooseMatch(wanted, [reissue])).toBe(reissue);
  });

  it("should not mind a re-recorded take when one was asked for", () => {
    const remake = { ...exact, title: "Hold On Loosely (Re-Recorded)" };

    expect(
      chooseMatch({ ...wanted, title: "Hold On Loosely (Re-Recorded)" }, [
        remake,
      ]),
    ).toBe(remake);
  });

  it("should take a live recording that came out long before any other release", () => {
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

  it("should not take a live recording that came out just ahead of the studio one", () => {
    const concert = {
      ...exact,
      title: "Hold On Loosely (Live Night 4)",
      albumName: "Four Nights Live in San Francisco",
      releaseYear: 2022,
    };
    const studio = {
      ...exact,
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 2024,
    };
    const long = { ...concert, releaseYear: 2019 };

    expect(chooseMatch(wanted, [concert, studio])).toBe(studio);
    expect(chooseMatch(wanted, [long, studio])).toBe(long);
    expect(chooseMatch(wanted, [concert])).toBeNull();
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

  it.each([
    ["Live in Malaysia 2004", 1983],
    ["2003.06.21 - East Troy, Wisconsin (Live)", 2001],
    ["Live Widespread Panic: 4/26/08 Raleigh, NC", 1991],
    ["Dick's Picks Vol. 3: 5/22/77 (Hollywood Sportatorium)", 1977],
    ["Cornell 5/8/1977 (Live)", 1977],
    ["Live 1987-10-31 (Live)", 1987],
    ["To Terrapin: May 28, 1977 Hartford, CT (Live)", 1977],
  ])(
    "should not take a live recording dated before the studio one when its date is the night it was recorded or a later year: %s",
    (albumName, releaseYear) => {
      const concert = {
        ...exact,
        title: "Hold On Loosely (Live)",
        albumName,
        releaseYear,
      };
      const studio = {
        ...exact,
        albumName: "Wild-Eyed Southern Boys",
        releaseYear: 1999,
      };

      expect(chooseMatch(wanted, [concert, studio])).toBe(studio);
    },
  );

  it("should not take a live recording dated before the studio one when its song title names a later year", () => {
    const concert = {
      title: "Hold On Loosely (Live 2004)",
      artistName: exact.artistName,
      releaseYear: 1983,
    };
    const studio = {
      ...exact,
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 1999,
    };

    expect(chooseMatch(wanted, [concert, studio])).toBe(studio);
  });

  it("should still take a live recording that names a year no later than its own", () => {
    const concert = {
      ...exact,
      albumName: "Live in 1964",
      releaseYear: 1964,
    };
    const old = { ...exact, albumName: "Live 12/31/69", releaseYear: 1970 };
    const studio = {
      ...exact,
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 1981,
    };

    expect(chooseMatch(wanted, [studio, concert, old])).toBe(concert);
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

  it("should take an album of its own over an earlier one credited to Various Artists", () => {
    const compilation = {
      ...exact,
      albumName: "Small Pond Presents: Emerging Part 2",
      releaseYear: 2021,
      variousArtists: true,
    };
    const album = { ...exact, albumName: "Wild-Eyed", releaseYear: 2025 };

    expect(chooseMatch(wanted, [compilation, album])).toBe(album);
    expect(isProperAlbum(wanted, compilation)).toBe(false);
  });

  it("should still take a compilation credited to Various Artists when it's all there is", () => {
    const compilation = { ...exact, variousArtists: true };

    expect(chooseMatch(wanted, [compilation])).toBe(compilation);
  });

  it("should not take a film's soundtrack credited to Various Artists for a compilation", () => {
    const soundtrack = {
      ...exact,
      albumName: "Back to the Future (Original Motion Picture Soundtrack)",
      releaseYear: 1985,
      variousArtists: true,
    };
    const later = { ...exact, albumName: "Wild-Eyed", releaseYear: 1990 };

    expect(chooseMatch(wanted, [later, soundtrack])).toBe(soundtrack);
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
    "Iguana Studios Rehearsal Tape - San Francisco 1978",
    "Rehearsals 1979",
    "The BBC Sessions",
    "Lost Outtakes",
    "Back to the 60's, Vol. 2 (Re-Recorded Versions)",
    "Hip Hop of the '80s (Rerecorded)",
    "Got the Life (Remixes) - EP",
    "Ray of Light Remixed",
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
      releaseYear: 1985,
    };
    const later = { ...exact, releaseYear: 1990 };

    expect(chooseMatch(wanted, [compilation, soundtrack])).toBe(soundtrack);
    expect(chooseMatch(wanted, [later, soundtrack])).toBe(soundtrack);
  });

  it("should take the album named for the song over another album of the same year", () => {
    const wantedSong = { title: "Lick It Up", artistName: "KISS" };
    const anniversary = {
      ...wantedSong,
      albumName: "Kiss 40: Decades of Decibels",
      releaseYear: 1983,
    };
    const titleTrack = {
      ...wantedSong,
      albumName: "Lick It Up",
      releaseYear: 1983,
    };

    expect(chooseMatch(wantedSong, [anniversary, titleTrack])).toBe(titleTrack);
  });

  it.each([
    "Ain't No Fun (If the Homies Can't Have None) [kissmenerdygirl edit]",
    "Ain't No Fun (Bad Boy Remix)",
    "Ain't No Fun (Club Mashup)",
  ])("should never take someone's remix or edit of the song: %s", (title) => {
    const song = { title: "Ain't No Fun", artistName: "Snoop Dogg" };
    const remixed = { ...song, title, releaseYear: 2017 };

    expect(chooseMatch(song, [remixed])).toBeNull();
    expect(chooseMatch({ ...song, title }, [remixed])).toBe(remixed);
  });

  it.each(["Raw (Edit)", "Raw (Radio Edit)", "Raw - Single Edit"])(
    "should still take the song's own edit: %s",
    (title) => {
      const song = { title: "Raw", artistName: "Big Daddy Kane" };
      const edit = { ...song, title };

      expect(chooseMatch(song, [edit])).toBe(edit);
    },
  );

  it("should take a song's single over a collection when it never was on an album", () => {
    const song = { title: "Liar, Liar", artistName: "The Castaways" };
    const single = {
      ...song,
      albumName: "Liar, Liar - Single",
      releaseYear: 2023,
    };
    const collection = {
      ...song,
      albumName: "One Hit Wonders - Vol. 1",
      releaseYear: 1994,
    };
    const hits = { ...song, albumName: "K-tel Classics", releaseYear: 1994 };

    expect(chooseMatch(song, [collection, hits, single])).toBe(single);
    expect(chooseMatch(song, [collection, hits])).toBe(collection);
  });

  it("should count a release called an album as a collection when its name spans years", () => {
    const span = {
      ...exact,
      albumName: "Best Lyricist Underground (2007–2022)",
      kind: "album" as const,
      releaseYear: 2024,
    };
    const album = {
      ...exact,
      albumName: "Live From the End of the World",
      kind: "album" as const,
      releaseYear: 2025,
    };

    expect(chooseMatch(wanted, [span, album])).toBe(album);
  });

  it("should not take an iTunes Originals collection for the album of the same year", () => {
    const song = { title: "Maps", artistName: "Yeah Yeah Yeahs" };
    const originals = {
      ...song,
      albumName: "iTunes Originals: Yeah Yeah Yeahs",
      releaseYear: 2003,
    };
    const album = { ...song, albumName: "Fever to Tell", releaseYear: 2003 };

    expect(chooseMatch(song, [originals, album])).toBe(album);
  });

  it("should rank a digital 45 as a single, behind the album of a later year", () => {
    const song = { title: "Apache", artistName: "The Sugarhill Gang" };
    const forty5 = {
      ...song,
      albumName: "Apache / Rapper's Delight [Digital 45]",
      releaseYear: 1979,
    };
    const album = { ...song, albumName: "8th Wonder", releaseYear: 1981 };

    expect(chooseMatch(song, [forty5, album])).toBe(album);
    expect(chooseMatch(song, [forty5])).toBe(forty5);
  });

  it("should take an album credited to a fuller name over the act's own compilation", () => {
    const song = { title: "Gimme Danger", artistName: "The Stooges" };
    const rehearsals = {
      ...song,
      albumName: "My Girl Hates My Heroin (1973 Tour Rehearsals)",
      releaseYear: 1973,
    };
    const album = {
      title: "Gimme Danger [2023 Remaster]",
      artistName: "Iggy & The Stooges",
      albumName: "Raw Power (2023 Remaster) [Iggy Mix]",
      releaseYear: 1973,
    };

    expect(chooseMatch(song, [rehearsals, album])).toBe(album);
  });

  it("should still take the act's own credit over a fuller one when both are on albums", () => {
    const song = { title: "Gimme Danger", artistName: "The Stooges" };
    const own = { ...song, albumName: "Raw Power", releaseYear: 1973 };
    const fuller = {
      title: "Gimme Danger",
      artistName: "Iggy & The Stooges",
      albumName: "Raw Power",
      releaseYear: 1973,
    };

    expect(chooseMatch(song, [fuller, own])).toBe(own);
  });

  it("should not take a numbered volume of an album for the album itself", () => {
    const song = {
      title: "Between The Sheets",
      artistName: "The Isley Brothers",
    };
    const volume = {
      ...song,
      albumName: "Between the Sheets, Vol. 1",
      releaseYear: 1972,
    };
    const album = {
      ...song,
      albumName: "Between the Sheets",
      releaseYear: 1983,
    };

    expect(chooseMatch(song, [volume, album])).toBe(album);
    expect(chooseMatch(song, [volume])).toBe(volume);
    expect(
      chooseMatch(song, [volume, { ...album, albumName: "Another Album" }]),
    ).toMatchObject({ albumName: "Between the Sheets, Vol. 1" });
  });

  it.each([
    "More of Funk Comes a-Live",
    "MTV Unplugged",
    "Kiss Alive: In Concert",
  ])(
    "should take a studio album over %s, a concert album, of the same year",
    (name) => {
      const song = { title: "Outstanding", artistName: "The Gap Band" };
      const concert = {
        ...song,
        albumName: name,
        releaseYear: 1982,
        releaseDate: "1982-01-01T00:00:00Z",
      };
      const studio = {
        ...song,
        albumName: "The Gap Band IV",
        releaseYear: 1982,
        releaseDate: "1982-05-17T07:00:00Z",
      };

      expect(chooseMatch(song, [concert, studio])).toBe(studio);
    },
  );

  it("should take the album that came out first in the year when the year ties", () => {
    const song = { title: "Outstanding", artistName: "The Gap Band" };
    const live = {
      ...song,
      albumName: "More of Funk Comes a-Live",
      releaseYear: 1982,
      releaseDate: "1982-11-01T08:00:00Z",
    };
    const studio = {
      ...song,
      albumName: "The Gap Band IV",
      releaseYear: 1982,
      releaseDate: "1982-05-17T07:00:00Z",
    };
    const undated = { ...song, albumName: "Another", releaseYear: 1982 };
    const yearOnly = { ...song, albumName: "Year Only", releaseYear: 1982 };

    expect(chooseMatch(song, [live, studio])).toBe(studio);
    expect(chooseMatch(song, [undated, live, studio])).toBe(studio);
    expect(chooseMatch(song, [yearOnly, undated])).toBe(yearOnly);
    expect(
      chooseMatch(song, [
        { ...undated, releaseYear: null },
        { ...yearOnly, releaseDate: "1982-06" },
      ]),
    ).toMatchObject({ albumName: "Year Only" });
  });

  it("should count an album named for its number ones as a collection", () => {
    const song = {
      title: "One Thing Leads To Another",
      artistName: "The Fixx",
    };
    const collection = {
      ...song,
      albumName: "20 #1's (80's Rock)",
      releaseYear: 1983,
    };
    const album = { ...song, albumName: "Reach the Beach", releaseYear: 1984 };

    expect(chooseMatch(song, [collection, album])).toBe(album);
  });

  it("should take the track titled as the song over a version of it on an album of the same kind", () => {
    const song = {
      title: "I Believe In A Thing Called Love",
      artistName: "The Darkness",
    };
    const version = {
      title: "I Believe in a Thing Called Love (Single Version)",
      artistName: "The Darkness",
      albumName: "Permission To Land... Again (20th Anniversary Edition)",
      releaseYear: 2002,
    };
    const track = {
      title: "I Believe in a Thing Called Love",
      artistName: "The Darkness",
      albumName: "Permission to Land (Bonus Track)",
      releaseYear: 2003,
    };

    expect(chooseMatch(song, [version, track])).toBe(track);
    expect(chooseMatch(song, [version])).toBe(version);
    expect(
      chooseMatch(
        { ...song, title: "I Believe In A Thing Called Love (Single Version)" },
        [version, track],
      ),
    ).toBe(version);
  });

  it("should take the version of the song that was asked for, remix or not", () => {
    const song = { title: "Ignition (Remix)", artistName: "R. Kelly" };
    const remix = {
      ...song,
      albumName: "Chocolate Factory",
      releaseYear: 2002,
      releaseDate: "2002-10-22",
    };
    const original = {
      title: "Ignition",
      artistName: "R. Kelly",
      albumName: "Totally R&B Sessions",
      releaseYear: 2002,
      releaseDate: "2002-10-21",
    };

    expect(chooseMatch(song, [original, remix])).toBe(remix);
    expect(chooseMatch(song, [original])).toBe(original);
    expect(chooseMatch({ ...song, title: "Ignition" }, [remix, original])).toBe(
      original,
    );
  });

  it.each(["Do The Funky Penguin (Part 1)", "Do The Funky Penguin (Pt. 1)"])(
    "should not hold a part number against the track on the album: %s",
    (title) => {
      const song = {
        title: "Do The Funky Penguin",
        artistName: "Rufus Thomas",
      };
      const album = {
        title,
        artistName: "Rufus Thomas",
        albumName: "Did You Heard Me?",
        releaseYear: 1971,
        releaseDate: "1971-01-01",
      };
      const other = {
        title: "Do The Funky Penguin",
        artistName: "Rufus Thomas",
        albumName: "Another Album",
        releaseYear: 1971,
        releaseDate: "1971-11-01",
      };

      expect(chooseMatch(song, [other, album])).toBe(album);
    },
  );

  it("should not hold a remaster note against the track on the album", () => {
    const song = { title: "True", artistName: "Spandau Ballet" };
    const album = {
      title: "True (Remastered)",
      artistName: "Spandau Ballet",
      albumName: "Spandau Ballet Studio",
      releaseYear: 1983,
    };
    const anthology = {
      title: "True",
      artistName: "Spandau Ballet",
      albumName: "Famous Ballads",
      releaseYear: 1983,
      releaseDate: "1983-03-04",
    };
    const earlier = { ...album, releaseDate: "1983-01-01" };

    expect(chooseMatch(song, [anthology, earlier])).toBe(earlier);
    expect(
      chooseMatch(song, [
        anthology,
        { ...earlier, title: "True (Single Version)" },
      ]),
    ).toBe(anthology);
  });

  it.each(["60's Soul", "Rock Of The 70's", "We Are The '80s", "90s Country"])(
    "should count %s, named for a decade, as a collection",
    (name) => {
      const song = {
        title: "Dance To The Music",
        artistName: "Sly & The Family Stone",
      };
      const decade = { ...song, albumName: name, releaseYear: 1967 };
      const album = {
        ...song,
        albumName: "Dance to the Music",
        releaseYear: 1968,
      };

      expect(chooseMatch(song, [decade, album])).toBe(album);
    },
  );

  it("should count an album called the history of an act as a collection", () => {
    const song = { title: "25 Or 6 To 4", artistName: "Chicago" };
    const history = {
      ...song,
      albumName: "Now More Than Ever: The History of Chicago (Remastered)",
      releaseYear: 1970,
    };
    const album = { ...song, albumName: "Chicago II", releaseYear: 1970 };

    expect(chooseMatch(song, [history, album])).toBe(album);
  });

  it("should take a film's soundtrack over its score, of the same year", () => {
    const song = {
      title: "The Goonies 'R' Good Enough",
      artistName: "Cyndi Lauper",
    };
    const score = {
      ...song,
      albumName: "The Goonies: Original Motion Picture Score",
      kind: "soundtrack" as const,
      releaseYear: 1985,
    };
    const soundtrack = {
      ...song,
      albumName: "The Goonies (Original Motion Picture Soundtrack)",
      kind: "soundtrack" as const,
      releaseYear: 1985,
    };

    expect(chooseMatch(song, [score, soundtrack])).toBe(soundtrack);
    expect(chooseMatch(song, [score])).toBe(score);
  });

  it.each(["A-Sides", "Singles: A-Sides And B-Sides", "Rarities & B-Sides"])(
    "should count %s as a collection",
    (name) => {
      const song = { title: "Black Hole Sun", artistName: "Soundgarden" };
      const collection = { ...song, albumName: name, releaseYear: 1994 };
      const album = { ...song, albumName: "Superunknown", releaseYear: 1994 };

      expect(chooseMatch(song, [collection, album])).toBe(album);
    },
  );

  it("should count an album just called Love Songs as a compilation", () => {
    const compilation = {
      ...exact,
      albumName: "Love Songs",
      releaseYear: 1977,
    };
    const soundtrack = {
      ...exact,
      albumName: "Saturday Night Fever (The Original Movie Soundtrack)",
      releaseYear: 1977,
    };

    expect(chooseMatch(wanted, [compilation, soundtrack])).toBe(soundtrack);
  });

  it("should count a release called an album as a collection when it is named for hits", () => {
    const hits = { ...exact, albumName: "Hits 96", kind: "album" as const };
    const album = {
      ...exact,
      albumName: "Travelling Without Moving",
      kind: "album" as const,
      releaseYear: 1996,
    };

    expect(chooseMatch(wanted, [{ ...hits, releaseYear: 1996 }, album])).toBe(
      album,
    );
  });

  it("should take a soundtrack over a compilation just called Greatest, of the same year", () => {
    const compilation = { ...exact, albumName: "Greatest", releaseYear: 1977 };
    const soundtrack = {
      ...exact,
      albumName: "Saturday Night Fever (The Original Movie Soundtrack)",
      releaseYear: 1977,
    };

    expect(chooseMatch(wanted, [compilation, soundtrack])).toBe(soundtrack);
  });

  it.each([
    "Live",
    "Drop the Bomb (Live)",
    "Alive [Live in Paris]",
    "Live at the Roxy",
    "Dick's Picks Vol. 12",
    "Dave’s Picks Volume 3",
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

  it("should ignore a nickname written without quotes", () => {
    const candidate = song("Damian Jr. Gong Marley");

    expect(chooseMatch(song("Damian Marley"), [candidate])).toBe(candidate);
    expect(
      chooseMatch(song("Damian Jr. Gong Marley"), [song("Damian Marley")]),
    ).not.toBeNull();
    expect(
      chooseMatch(song("Damian Marley"), [
        song("Damian One Two Three Four Marley"),
      ]),
    ).toBeNull();
    expect(
      chooseMatch(song("Marley"), [song("Marley Damian Marley")]),
    ).toBeNull();
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
    // Both spellings of each are on iTunes, for the same record.
    const elo = song("Electric Light Orchestra", "Rock and Roll Is King");
    const devo = song("Devo", "Jerkin' Back and Forth");

    expect(
      chooseMatch(song("Electric Light Orchestra", "Rock 'N' Roll Is King"), [
        elo,
      ]),
    ).toBe(elo);
    expect(chooseMatch(song("Devo", "Jerkin' Back 'N' Forth"), [devo])).toBe(
      devo,
    );
    // And an ampersand, which iTunes uses for the same song, is and too.
    const heaven = song("The Righteous Brothers", "Rock and Roll Heaven");

    expect(
      chooseMatch(song("The Righteous Brothers", "Rock & Roll Heaven"), [
        heaven,
      ]),
    ).toBe(heaven);
    expect(
      chooseMatch(song("Joan Jett & The Blackhearts", "I Love Rock 'n' Roll"), [
        song("Joan Jett & The Blackhearts", "I Love Rock 'N Roll"),
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

describe("chooseMatch, for an act credited with its backing band", () => {
  const song = (artistName: string, extra = {}) => ({
    title: "7",
    artistName,
    ...extra,
  });

  it("should count the act with its band as the act itself, so the earlier album wins over a later single", () => {
    const single = song("Prince", {
      albumName: "7 (E Flat Version) - Single",
      releaseYear: 2023,
    });
    const album = song("Prince & The New Power Generation", {
      albumName: "[Love Symbol]",
      releaseYear: 1992,
    });

    expect(chooseMatch(song("Prince"), [single, album])).toBe(album);
  });

  it("should accept the band's name for the act in either direction", () => {
    const withBand = song("Prince and the Revolution");

    expect(chooseMatch(song("Prince"), [withBand])).toBe(withBand);
    expect(
      chooseMatch(song("Prince & The Revolution"), [song("Prince")]),
    ).not.toBeNull();
  });

  it("should not hold the band's name to the near-identical title that a guest credit needs", () => {
    const withBand = {
      title: "Raspberry Beret",
      artistName: "Prince & The Revolution",
    };

    expect(
      chooseMatch({ title: "Raspberry Beretz", artistName: "Prince" }, [
        withBand,
      ]),
    ).toBe(withBand);
  });

  it("should still rank a guest credit below the act on its own", () => {
    const guest = song("Prince & Tevin Campbell", { releaseYear: 1990 });
    const alone = song("Prince", { releaseYear: 2010 });

    expect(chooseMatch(song("Prince"), [guest, alone])).toBe(alone);
  });
});

describe("chooseMatch, for a single or EP", () => {
  const release = (albumName: string, releaseYear: number) => ({
    ...exact,
    albumName,
    releaseYear,
  });

  it("should prefer an album to an earlier single of the song", () => {
    const album = release("Wild-Eyed Southern Boys", 1981);

    expect(
      chooseMatch(wanted, [release("Hold On Loosely - Single", 1980), album]),
    ).toBe(album);
  });

  it.each([
    "Hold On Loosely - Single",
    "Hold On Loosely - single",
    "Hold On Loosely (Single)",
  ])("should take %s only when there is nothing else", (name) => {
    const single = release(name, 1980);

    expect(chooseMatch(wanted, [single])).toBe(single);
  });

  it.each(["Jar of Flies - EP", "Jar of Flies [EP]"])(
    "should judge %s by its year, so an earlier EP beats a later album",
    (name) => {
      const album = release("Wild-Eyed Southern Boys", 1994);

      expect(chooseMatch(wanted, [album, release(name, 1992)])).toStrictEqual(
        release(name, 1992),
      );
      expect(chooseMatch(wanted, [release(name, 1996), album])).toBe(album);
    },
  );

  it.each([
    "Hold On Loosely - EP",
    "Hold On Loosely: The Remixes [EP]",
    "hold on loosely - EP",
  ])(
    "should hold %s against the song, being a single by another name",
    (name) => {
      const album = release("Wild-Eyed Southern Boys", 1994);

      expect(chooseMatch(wanted, [release(name, 1992), album])).toBe(album);
      expect(chooseMatch(wanted, [release(name, 1992)])).toStrictEqual(
        release(name, 1992),
      );
    },
  );

  it("should put an album ahead of an EP, and an EP ahead of a soundtrack, of the same year", () => {
    const album = release("Wild-Eyed Southern Boys", 1994);
    const ep = release("Jar of Flies - EP", 1994);
    const soundtrack = release("Clerks (Music from the Motion Picture)", 1994);

    expect(chooseMatch(wanted, [soundtrack, ep, album])).toBe(album);
    expect(chooseMatch(wanted, [soundtrack, ep])).toBe(ep);
  });

  it("should put an album ahead of an EP, and an EP ahead of a soundtrack, when a service says which each is", () => {
    const stated = (kind: "album" | "ep" | "soundtrack") => ({
      ...exact,
      albumName: `Release ${kind}`,
      releaseYear: 1990,
      kind,
    });

    expect(
      chooseMatch(wanted, [
        stated("soundtrack"),
        stated("ep"),
        stated("album"),
      ]),
    ).toMatchObject({ kind: "album" });
    expect(
      chooseMatch(wanted, [stated("soundtrack"), stated("ep")]),
    ).toMatchObject({ kind: "ep" });
  });

  it("should take a soundtrack that came out before the EP", () => {
    const soundtrack = release("Clerks (Music from the Motion Picture)", 1992);

    expect(chooseMatch(wanted, [release("Sap - EP", 1994), soundtrack])).toBe(
      soundtrack,
    );
  });

  it("should still hold a remix EP against the song", () => {
    const remix = release("Got the Life (Remixes) - EP", 1990);
    const album = release("Follow the Leader", 1998);

    expect(chooseMatch(wanted, [remix, album])).toBe(album);
  });

  it("should not take an album with single or ep in its name for a single", () => {
    const album = release("The Single Life", 1990);
    const later = release("Wild-Eyed Southern Boys", 1995);

    expect(chooseMatch(wanted, [later, album])).toBe(album);
  });

  it("should rank a single with the compilations, the earliest of them winning", () => {
    const single = release("Hold On Loosely - Single", 1980);
    const compilation = release("Greatest Hits", 1990);

    expect(chooseMatch(wanted, [compilation, single])).toBe(single);
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
