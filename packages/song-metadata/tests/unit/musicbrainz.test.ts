import { describe, expect, it, vi } from "vitest";
import { createMusicBrainzLookup } from "../../src/musicbrainz.js";

const wanted = { title: "Hold On Loosely", artistName: ".38 Special" };

const urlOf = (input: Parameters<typeof fetch>[0]) =>
  new URL(input instanceof Request ? input.url : input);

const passThrough = { schedule: <T>(task: () => Promise<T>) => task() };

function release(
  title: string,
  group: string,
  type: { primary?: string; secondary?: string[] } = {},
  extra: Record<string, unknown> = {},
) {
  return {
    title,
    date: "1981-04-14",
    status: "Official",
    "release-group": {
      id: group,
      "primary-type": type.primary ?? "Album",
      "secondary-types": type.secondary ?? [],
    },
    ...extra,
  };
}

function recording(releases: unknown, extra: Record<string, unknown> = {}) {
  return {
    id: "rec-1",
    title: "Hold On Loosely",
    "artist-credit": [{ name: ".38 Special", joinphrase: "" }],
    releases,
    ...extra,
  };
}

/** Answers the three kinds of request the lookup makes. */
function service({
  recordings = [recording([release("Wild-Eyed Southern Boys", "g1")])],
  search = 200,
  groupDate = "1981-04-14",
  groupDates = {},
  groupTitle = null,
  group = 200,
  covers = {},
  more = [],
  moreStatus = 200,
  moreThrows = false,
  official = [],
}: {
  recordings?: unknown;
  search?: number;
  groupDate?: string | null;
  /** The first release of particular groups, where it isn't `groupDate`. */
  groupDates?: Record<string, string | null>;
  groupTitle?: string | null;
  group?: number;
  covers?: Record<string, number>;
  /** The recordings the second page of the search holds. */
  more?: unknown;
  moreStatus?: number;
  moreThrows?: boolean;
  /** The recordings the search for official albums alone holds. */
  official?: unknown;
} = {}) {
  return vi.fn<typeof fetch>((input) => {
    const url = urlOf(input);

    if (url.hostname === "coverartarchive.org") {
      const id = url.pathname.split("/")[2] ?? "";

      return Promise.resolve(new Response(null, { status: covers[id] ?? 307 }));
    }

    if (url.pathname.includes("release-group")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            "first-release-date": Object.hasOwn(
              groupDates,
              url.pathname.split("/").at(-1) ?? "",
            )
              ? groupDates[url.pathname.split("/").at(-1) ?? ""]
              : groupDate,
            title: groupTitle,
          }),
          { status: group },
        ),
      );
    }

    if (url.searchParams.get("query")?.includes("primarytype:album")) {
      return Promise.resolve(
        new Response(JSON.stringify({ recordings: official }), { status: 200 }),
      );
    }

    if (url.searchParams.has("offset")) {
      return moreThrows
        ? Promise.reject(new Error("the second page timed out"))
        : Promise.resolve(
            new Response(JSON.stringify({ recordings: more }), {
              status: moreStatus,
            }),
          );
    }

    return Promise.resolve(
      new Response(JSON.stringify({ recordings }), { status: search }),
    );
  });
}

const lookupWith = (fetch: typeof globalThis.fetch) =>
  createMusicBrainzLookup({ fetch, limiter: passThrough });

describe("MusicBrainz lookup", () => {
  it("should report the album, its true first year, and where its cover is", async () => {
    await expect(lookupWith(service())(wanted)).resolves.toEqual({
      status: "matched",
      source: "musicbrainz",
      sourceTrackId: "rec-1",
      artworkUrl: "https://coverartarchive.org/release-group/g1/front",
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 1981,
      isAlbum: true,
    });
  });

  it("should search by the title and artist", async () => {
    const fetch = service({ recordings: [] });

    await lookupWith(fetch)({ title: 'Say "Hi"', artistName: "Them" });

    const url = urlOf(fetch.mock.calls[0]?.[0] ?? "");

    expect(url.origin + url.pathname).toBe(
      "https://musicbrainz.org/ws/2/recording",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      query: 'recording:"Say  Hi " AND artist:"Them"',
      fmt: "json",
      limit: "30",
    });
  });

  it("should also search for the first and last words of a longer name", async () => {
    const fetch = service({ recordings: [] });

    await lookupWith(fetch)({ title: "Move!", artistName: "Damian Marley" });

    const url = urlOf(fetch.mock.calls[0]?.[0] ?? "");

    expect(url.searchParams.get("query")).toBe(
      'recording:"Move!" AND (artist:"Damian Marley" OR artist:(damian AND marley))',
    );
  });

  it("should leave out the and and when searching for the words of a name", async () => {
    const fetch = service({ recordings: [] });

    await lookupWith(fetch)({
      title: "Kokomo",
      artistName: "The Beach Boys",
    });

    expect(
      urlOf(fetch.mock.calls[0]?.[0] ?? "").searchParams.get("query"),
    ).toBe(
      'recording:"Kokomo" AND (artist:"The Beach Boys" OR artist:(beach AND boys))',
    );
  });

  it("should search only for the name when it has no words", async () => {
    const fetch = service({ recordings: [] });

    await lookupWith(fetch)({ title: "Hi", artistName: "!!!" });

    expect(
      urlOf(fetch.mock.calls[0]?.[0] ?? "").searchParams.get("query"),
    ).toBe('recording:"Hi" AND artist:"!!!"');
  });

  it("should say who is asking", async () => {
    const fetch = service();

    await lookupWith(fetch)(wanted);

    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({
      "User-Agent": expect.stringContaining("song-lists") as string,
    });
  });

  it("should take the album's first release year over the edition's", async () => {
    const fetch = service({
      recordings: [
        recording([
          release(
            "Wild-Eyed Southern Boys (Deluxe)",
            "g1",
            {},
            { date: "2011" },
          ),
        ]),
      ],
    });

    await expect(lookupWith(fetch)(wanted)).resolves.toMatchObject({
      releaseYear: 1981,
    });
  });

  it("should fall back on the release's own year when the album has no first date", async () => {
    await expect(
      lookupWith(service({ groupDate: null }))(wanted),
    ).resolves.toMatchObject({ releaseYear: 1981 });
    await expect(
      lookupWith(service({ group: 500 }))(wanted),
    ).resolves.toMatchObject({ releaseYear: 1981 });
  });

  it("should say not found when nothing gives the album a year", async () => {
    const fetch = service({
      recordings: [
        recording([release("Wild-Eyed Southern Boys", "g1", {}, { date: "" })]),
      ],
      groupDate: null,
    });

    await expect(lookupWith(fetch)(wanted)).resolves.toEqual({
      status: "not_found",
    });
  });

  it("should use the earliest release of an album for its name", async () => {
    const fetch = service({
      recordings: [
        recording([
          release("Wild-Eyed Southern Boys (Promo)", "g1", {}, { date: "" }),
          release(
            "Wild-Eyed Southern Boys (Reissue)",
            "g1",
            {},
            { date: "2011" },
          ),
          release("Wild-Eyed Southern Boys", "g1", {}, { date: "1981" }),
          release("Wild-Eyed Southern Boys (Import)", "g1", {}, { date: "" }),
          release("Wild-Eyed Southern Boys (Japan)", "g1", {}, { date: "" }),
        ]),
      ],
    });

    await expect(lookupWith(fetch)(wanted)).resolves.toMatchObject({
      albumName: "Wild-Eyed Southern Boys",
    });
  });

  it.each([
    ["live", { secondary: ["Live"] }],
    ["remix", { secondary: ["Remix"] }],
    ["DJ mix", { secondary: ["Compilation", "DJ-mix"] }],
    ["broadcast", { primary: "Broadcast" }],
    ["unknown type", { primary: "" }],
  ])("should never take a %s release", async (_name, type) => {
    const fetch = service({
      recordings: [recording([release("Somewhere", "g1", type)])],
    });

    await expect(lookupWith(fetch)(wanted)).resolves.toEqual({
      status: "not_found",
    });
  });

  it("should take an album over a single, and a single over a compilation", async () => {
    const lookup = lookupWith(
      service({
        recordings: [
          recording([
            release("Greatest Hits", "g3", { secondary: ["Compilation"] }),
            release(
              "Hold On Loosely",
              "g2",
              { primary: "Single" },
              { date: "1980" },
            ),
            release("Wild-Eyed Southern Boys", "g1", {}, { date: "1981" }),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Wild-Eyed Southern Boys",
      isAlbum: true,
    });
  });

  it.each([
    ["a single", { primary: "Single" }, "Hold On Loosely"],
    ["a compilation", { secondary: ["Compilation"] }, "Greatest Hits"],
  ])(
    "should settle for %s when that is all there is",
    async (_n, type, name) => {
      const lookup = lookupWith(
        service({ recordings: [recording([release(name, "g1", type)])] }),
      );

      await expect(lookup(wanted)).resolves.toMatchObject({
        albumName: name,
        isAlbum: false,
      });
    },
  );

  it("should treat an album credited to Various Artists as a compilation", async () => {
    const credit = (name: string) => ({ "artist-credit": [{ name }] });
    const lookup = lookupWith(
      service({
        recordings: [
          recording([
            release("Neue Hits 90", "g2", {}, credit("Various Artists")),
            release("Wild-Eyed Southern Boys", "g1", {}, credit(".38 Special")),
          ]),
          recording([
            release("Another", "g3", {}, { "artist-credit": "none" }),
          ]),
          recording([release("Third", "g4", {}, { "artist-credit": [{}] })]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Wild-Eyed Southern Boys",
    });
  });

  it("should pass over an album credited to another act, as a cover or sample would be", async () => {
    const credit = (name: string) => ({ "artist-credit": [{ name }] });
    const lookup = lookupWith(
      service({
        recordings: [
          recording([
            release("Pitiless Censors", "g2", {}, credit("John Maus")),
            release(
              "Liar Liar",
              "g1",
              { primary: "Single" },
              credit(".38 Special"),
            ),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Liar Liar",
      isAlbum: false,
    });
  });

  it.each([
    ["a credit with no names", { "artist-credit": [{}] }, wanted],
    [
      "an act with no words in its name",
      { "artist-credit": [{ name: "John Maus" }] },
      { title: "Hi", artistName: "AC/DC" },
    ],
  ])("should not hold %s against an album", async (_n, extra, song) => {
    const lookup = lookupWith(
      service({
        recordings: [
          recording([release("Anything", "g1", {}, extra)], {
            title: song.title,
            "artist-credit": [{ name: song.artistName }],
          }),
        ],
      }),
    );

    await expect(lookup(song)).resolves.toMatchObject({
      albumName: "Anything",
    });
  });

  describe("when the first page has no album of the song's own", () => {
    const single = recording(
      [release("Hold On Loosely", "g2", { primary: "Single" })],
      { id: "rec-single" },
    );
    const album = recording([release("Wild-Eyed Southern Boys", "g1")], {
      id: "rec-album",
    });

    it("should look further down for the album", async () => {
      const fetch = service({ recordings: [single], more: [album] });

      await expect(lookupWith(fetch)(wanted)).resolves.toMatchObject({
        albumName: "Wild-Eyed Southern Boys",
        sourceTrackId: "rec-album",
        isAlbum: true,
      });

      const asked = fetch.mock.calls
        .map(([input]) => urlOf(input))
        .find((url) => url.searchParams.has("offset"));

      expect(asked?.searchParams.get("offset")).toBe("30");
      expect(asked?.searchParams.get("limit")).toBe("70");
    });

    it.each([
      ["a page that can't be had", { moreStatus: 503 }],
      ["a page that times out", { moreThrows: true }],
      ["a page with nothing more", { more: [] }],
      ["a page that isn't a list", { more: "nonsense" }],
    ])("should make do with the first page for %s", async (_n, extra) => {
      const fetch = service({ recordings: [single], ...extra });

      await expect(lookupWith(fetch)(wanted)).resolves.toMatchObject({
        albumName: "Hold On Loosely",
        isAlbum: false,
      });
    });

    it("should look at the official albums alone when the next results have none", async () => {
      const fetch = service({
        recordings: [single],
        more: [single],
        official: [album],
      });

      await expect(lookupWith(fetch)(wanted)).resolves.toMatchObject({
        albumName: "Wild-Eyed Southern Boys",
        sourceTrackId: "rec-album",
      });

      const queries = fetch.mock.calls
        .map(([input]) => urlOf(input).searchParams.get("query") ?? "")
        .filter((query) => query.startsWith("recording:"));

      expect(queries.at(-1)).toContain(
        "AND status:official AND primarytype:album AND NOT secondarytype:live",
      );
    });

    it("should not ask for the official albums when the next results had one", async () => {
      const fetch = service({ recordings: [single], more: [album] });

      await lookupWith(fetch)(wanted);

      expect(
        fetch.mock.calls.some(([input]) =>
          (urlOf(input).searchParams.get("query") ?? "").includes(
            "primarytype:album",
          ),
        ),
      ).toBe(false);
    });

    it("should look further down when the first page has nothing at all", async () => {
      const fetch = service({ recordings: [], more: [album] });

      await expect(lookupWith(fetch)(wanted)).resolves.toMatchObject({
        albumName: "Wild-Eyed Southern Boys",
      });
    });
  });

  it("should not look further when the first page has an album", async () => {
    const fetch = service();

    await lookupWith(fetch)(wanted);

    expect(
      fetch.mock.calls.some(([input]) =>
        urlOf(input).searchParams.has("offset"),
      ),
    ).toBe(false);
  });

  it("should take a soundtrack as an album", async () => {
    const lookup = lookupWith(
      service({
        recordings: [
          recording([
            release("Footloose", "g1", { secondary: ["Soundtrack"] }),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Footloose",
      isAlbum: true,
    });
  });

  it("should take a soundtrack entered as a compilation too, ahead of a single", async () => {
    const lookup = lookupWith(
      service({
        recordings: [
          recording([
            release(
              "Footloose",
              "g1",
              { secondary: ["Compilation", "Soundtrack"] },
              { date: "1988" },
            ),
            release(
              "Hold On Loosely",
              "g2",
              { primary: "Single" },
              { date: "1987" },
            ),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Footloose",
      isAlbum: true,
    });
  });

  it.each([
    ["more than ten years before the album", "1965", "single"],
    ["less than ten years before the album", "1980", "album"],
  ])(
    "should take a song's single when it came out %s",
    async (_n, singleYear, expected) => {
      const lookup = lookupWith(
        service({
          groupDates: { g1: "1987", g2: singleYear },
          recordings: [
            recording([
              release(
                "Good Morning Vietnam",
                "g1",
                { secondary: ["Soundtrack"] },
                { date: "1987" },
              ),
              release(
                "Hold On Loosely",
                "g2",
                { primary: "Single" },
                { date: singleYear },
              ),
            ]),
          ],
        }),
      );

      await expect(lookup(wanted)).resolves.toMatchObject({
        albumName:
          expected === "single" ? "Hold On Loosely" : "Good Morning Vietnam",
      });
    },
  );

  it("should take an EP as an album", async () => {
    const lookup = lookupWith(
      service({
        recordings: [
          recording([release("Four Songs", "g1", { primary: "EP" })]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Four Songs",
      isAlbum: true,
    });
  });

  it("should try the next album when one has no cover art", async () => {
    const lookup = lookupWith(
      service({
        recordings: [
          recording([
            release("Wild-Eyed Southern Boys", "g1", {}, { date: "1981" }),
            release("Special Forces", "g2", {}, { date: "1982" }),
          ]),
        ],
        covers: { g1: 404 },
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Special Forces",
      artworkUrl: "https://coverartarchive.org/release-group/g2/front",
    });
  });

  it("should say not found when the albums found have no cover art", async () => {
    const lookup = lookupWith(
      service({
        recordings: [recording([release("Wild-Eyed Southern Boys", "g1")])],
        covers: { g1: 404 },
      }),
    );

    await expect(lookup(wanted)).resolves.toEqual({ status: "not_found" });
  });

  it("should give up after trying a few albums for cover art", async () => {
    const releases = ["g1", "g2", "g3", "g4"].map((id, index) =>
      release(`Album ${id}`, id, {}, { date: String(1981 + index) }),
    );
    const fetch = service({
      recordings: [recording(releases)],
      covers: { g1: 404, g2: 404, g3: 404 },
    });

    await expect(lookupWith(fetch)(wanted)).resolves.toEqual({
      status: "not_found",
    });
  });

  it("should say not found when nothing is the song", async () => {
    const fetch = service({
      recordings: [
        recording([release("Elsewhere", "g1")], { title: "Caught Up in You" }),
      ],
    });

    await expect(lookupWith(fetch)(wanted)).resolves.toEqual({
      status: "not_found",
    });
  });

  it("should join a credit of several artists", async () => {
    const lookup = lookupWith(
      service({
        recordings: [
          recording([release("Duets", "g1")], {
            "artist-credit": [
              { name: ".38 Special", joinphrase: " & " },
              { name: "Friends" },
            ],
          }),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      status: "matched",
    });
  });

  it("should skip recordings and releases it can't use", async () => {
    const lookup = lookupWith(
      service({
        recordings: [
          null,
          "nonsense",
          recording([release("A", "g0")], { id: undefined }),
          recording([release("A", "g0")], { title: "" }),
          recording([release("A", "g0")], { "artist-credit": undefined }),
          recording([release("A", "g0")], { "artist-credit": [null] }),
          recording("nonsense"),
          recording([
            null,
            { ...release("A", "g0"), status: "Bootleg" },
            { ...release("A", "g0"), "release-group": undefined },
            { ...release("A", "g0"), "release-group": { id: "" } },
            { ...release("", "g0") },
            release("Wild-Eyed Southern Boys", "g1"),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      status: "matched",
      albumName: "Wild-Eyed Southern Boys",
    });
  });

  it("should take a release that states no status", async () => {
    const lookup = lookupWith(
      service({
        recordings: [
          recording([
            release("State of Euphoria", "g1", {}, { status: undefined }),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      status: "matched",
      albumName: "State of Euphoria",
    });
  });

  it("should say not found when the answer has no recordings", async () => {
    await expect(
      lookupWith(service({ recordings: "none" }))(wanted),
    ).resolves.toEqual({ status: "not_found" });
  });

  it("should report an error when MusicBrainz turns the request away", async () => {
    await expect(lookupWith(service({ search: 503 }))(wanted)).resolves.toEqual(
      { status: "error", message: "MusicBrainz answered 503." },
    );
  });

  it("should report an error when the Cover Art Archive does", async () => {
    await expect(
      lookupWith(service({ covers: { g1: 500 } }))(wanted),
    ).resolves.toEqual({
      status: "error",
      message: "The Cover Art Archive answered 500.",
    });
  });

  it("should report an error when a request fails", async () => {
    const down = vi.fn<typeof fetch>(() =>
      Promise.reject(new Error("offline")),
    );
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    const odd = vi.fn<typeof fetch>(() => Promise.reject("odd"));

    await expect(lookupWith(down)(wanted)).resolves.toEqual({
      status: "error",
      message: "offline",
    });
    await expect(lookupWith(odd)(wanted)).resolves.toEqual({
      status: "error",
      message: "The MusicBrainz lookup failed.",
    });
  });

  it("should not ask again about an album it has already looked into", async () => {
    const fetch = service();
    const lookup = lookupWith(fetch);

    await lookup(wanted);
    await lookup(wanted);

    const asked = fetch.mock.calls.map(([input]) => urlOf(input).pathname);

    expect(asked.filter((path) => path.includes("/front"))).toHaveLength(1);
    expect(asked.filter((path) => path.includes("release-group"))).toHaveLength(
      2,
    );
  });

  it("should ask again after a failure", async () => {
    const fetch = service({ covers: { g1: 500 } });
    const lookup = lookupWith(fetch);

    await lookup(wanted);
    await lookup(wanted);

    expect(
      fetch.mock.calls.filter(([input]) =>
        urlOf(input).pathname.includes("/front"),
      ),
    ).toHaveLength(2);
  });

  it("should take an EP named for the song when it came out before the album", async () => {
    const lookup = lookupWith(
      service({
        groupDates: { g1: "1980", g2: "1981" },
        recordings: [
          recording([
            release(
              "Hold On Loosely",
              "g1",
              { primary: "EP" },
              { date: "1980" },
            ),
            release("Wild-Eyed Southern Boys", "g2", {}, { date: "1981" }),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Hold On Loosely",
      releaseYear: 1980,
      isAlbum: true,
    });
  });

  it("should date a release with no date by the recording's first release", async () => {
    const lookup = lookupWith(
      service({
        groupDate: null,
        recordings: [
          recording(
            [
              release("Special Forces", "g2", {}, { date: "2018" }),
              release("Wild-Eyed Southern Boys", "g1", {}, { date: "" }),
            ],
            { "first-release-date": "1981-04-14" },
          ),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 1981,
    });
  });

  it("should date an album with no date by when the album first came out, not by the recording", async () => {
    const lookup = lookupWith(
      service({
        groupDate: "1997",
        recordings: [
          recording(
            [
              release(
                "Special Forces",
                "g2",
                { primary: "EP" },
                { date: "2001-12-11" },
              ),
              release("Wild-Eyed Southern Boys", "g1", {}, { date: "" }),
            ],
            { "first-release-date": "2014-12-12" },
          ),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 1997,
    });
  });

  it("should pass over an album that nothing dates", async () => {
    const lookup = lookupWith(
      service({
        groupDate: null,
        recordings: [
          recording([
            release("The Hip Hop Bible", "g2", {}, { date: "" }),
            release("Wild-Eyed Southern Boys", "g1", {}, { date: "1981" }),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Wild-Eyed Southern Boys",
    });
  });

  it("should name the album as MusicBrainz does, not by a later edition's title", async () => {
    const lookup = lookupWith(
      service({
        groupDate: "1991",
        groupTitle: "Full Length L.P.",
        recordings: [
          recording([
            release(
              "The Album Formerly Known as Full Length LP",
              "g1",
              {},
              { date: "1996-07-30" },
            ),
          ]),
        ],
      }),
    );

    await expect(lookup(wanted)).resolves.toMatchObject({
      albumName: "Full Length L.P.",
      releaseYear: 1991,
    });
  });
});
