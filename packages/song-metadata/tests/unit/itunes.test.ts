import { afterEach, describe, expect, it, vi } from "vitest";
import { createItunesLookup } from "../../src/itunes.js";

const wanted = { title: "Hold On Loosely", artistName: ".38 Special" };

const track = {
  trackId: 1234,
  trackName: "Hold On Loosely",
  artistName: ".38 Special",
  collectionName: "Wild-Eyed Southern Boys",
  artworkUrl100: "https://example.test/art/100x100bb.jpg",
  releaseDate: "1981-04-14T07:00:00Z",
};

const passThrough = { schedule: <T>(task: () => Promise<T>) => task() };

function answering(body: unknown, init?: ResponseInit) {
  return vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(JSON.stringify(body), init)),
  );
}

describe("iTunes lookup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should report what iTunes shows for the song it matched", async () => {
    const lookup = createItunesLookup({
      fetch: answering({ results: [track] }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toEqual({
      status: "matched",
      source: "itunes",
      sourceTrackId: "1234",
      artworkUrl: "https://example.test/art/100x100bb.jpg",
      albumName: "Wild-Eyed Southern Boys",
      releaseYear: 1981,
      isAlbum: true,
      releaseRank: 0,
    });
  });

  it("should ask iTunes for a good number of songs matching the artist and title", async () => {
    const fetch = answering({ results: [] });

    await createItunesLookup({ fetch, limiter: passThrough })(wanted);

    const url = new URL(fetch.mock.calls[0]?.[0] as URL);

    expect(url.origin + url.pathname).toBe("https://itunes.apple.com/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      term: ".38 Special Hold On Loosely",
      media: "music",
      entity: "song",
      limit: "15",
    });
  });

  it("should say not found when nothing is close enough", async () => {
    const lookup = createItunesLookup({
      fetch: answering({
        results: [{ ...track, trackName: "Caught Up in You" }],
      }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toEqual({ status: "not_found" });
  });

  it("should prefer an album of its own to a compilation the song is also on", async () => {
    const lookup = createItunesLookup({
      fetch: answering({
        results: [
          {
            ...track,
            trackId: 1,
            collectionName: "Greatest Hits",
          },
          { ...track, trackId: 2, collectionName: "Wild-Eyed Southern Boys" },
        ],
      }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toMatchObject({
      sourceTrackId: "2",
      albumName: "Wild-Eyed Southern Boys",
    });
  });

  it("should not count a live recording taken for the original as an album of its own", async () => {
    const lookup = createItunesLookup({
      fetch: answering({
        results: [
          {
            ...track,
            trackId: 1,
            trackName: "Hold On Loosely (Live)",
            collectionName: "At the Roxy (Live)",
            releaseDate: "1964-01-01T08:00:00Z",
          },
          { ...track, trackId: 2 },
        ],
      }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toMatchObject({
      sourceTrackId: "1",
      isAlbum: false,
    });
  });

  it("should leave out details iTunes didn't give", async () => {
    const lookup = createItunesLookup({
      fetch: answering({
        results: [
          {
            trackId: 7,
            trackName: "Hold On Loosely",
            artistName: ".38 Special",
            collectionName: "",
            releaseDate: "someday",
          },
        ],
      }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toEqual({
      status: "matched",
      source: "itunes",
      sourceTrackId: "7",
      artworkUrl: null,
      albumName: null,
      releaseYear: null,
      isAlbum: true,
      releaseRank: 0,
    });
  });

  it("should leave out the release year when iTunes gives it in another form", async () => {
    const lookup = createItunesLookup({
      fetch: answering({ results: [{ ...track, releaseDate: 1981 }] }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toMatchObject({ releaseYear: null });
  });

  it("should skip results that aren't songs it can use", async () => {
    const lookup = createItunesLookup({
      fetch: answering({
        results: [
          null,
          "nonsense",
          { ...track, trackId: "x" },
          { ...track, trackName: undefined },
          { ...track, artistName: "" },
          track,
        ],
      }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toMatchObject({
      status: "matched",
      sourceTrackId: "1234",
    });
  });

  it("should report an error when iTunes turns the request away", async () => {
    const lookup = createItunesLookup({
      fetch: answering({}, { status: 429 }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toEqual({
      status: "error",
      message: "iTunes answered 429.",
    });
  });

  it("should report an error when the answer isn't in the form it expects", async () => {
    const lookup = createItunesLookup({
      fetch: answering({ results: "none" }),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toEqual({
      status: "error",
      message: "iTunes answered in a form we don't recognize.",
    });
  });

  it("should report an error when the request can't be made", async () => {
    const lookup = createItunesLookup({
      fetch: () => Promise.reject(new Error("offline")),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toEqual({
      status: "error",
      message: "offline",
    });
  });

  it("should report an error when something other than an error is thrown", async () => {
    const lookup = createItunesLookup({
      // A service's client may throw something that isn't an Error.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      fetch: () => Promise.reject("offline"),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toEqual({
      status: "error",
      message: "The iTunes lookup failed.",
    });
  });

  it("should report an error when the answer isn't readable", async () => {
    const lookup = createItunesLookup({
      fetch: () => Promise.resolve(new Response("<html>")),
      limiter: passThrough,
    });

    await expect(lookup(wanted)).resolves.toMatchObject({ status: "error" });
  });

  it("should use the real network and a limiter of its own unless told otherwise", async () => {
    const fetch = answering({ results: [track] });

    vi.stubGlobal("fetch", fetch);

    await expect(createItunesLookup()(wanted)).resolves.toMatchObject({
      status: "matched",
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
