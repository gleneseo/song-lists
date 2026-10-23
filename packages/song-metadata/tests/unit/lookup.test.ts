import { describe, expect, it, vi } from "vitest";
import { combineLookups, createSongLookup } from "../../src/lookup.js";
import type { SongLookupResult } from "../../src/result.js";

const wanted = { title: "Hold On Loosely", artistName: ".38 Special" };

const itunes: SongLookupResult = {
  status: "matched",
  source: "itunes",
  sourceTrackId: "1",
  artworkUrl: "https://example.test/art/100x100bb.jpg",
  albumName: "Wild-Eyed Southern Boys",
  releaseYear: 1981,
  isAlbum: true,
};

const musicbrainz: SongLookupResult = {
  status: "matched",
  source: "musicbrainz",
  sourceTrackId: "abc",
  artworkUrl: "https://coverartarchive.org/release-group/g/front",
  albumName: "Wild-Eyed Southern Boys",
  releaseYear: 1981,
  isAlbum: true,
};

const notFound: SongLookupResult = { status: "not_found" };
const failed: SongLookupResult = { status: "error", message: "down" };

describe("combining lookups", () => {
  it("should take iTunes when both found the same thing", () => {
    expect(combineLookups(itunes, musicbrainz)).toEqual(itunes);
  });

  it("should take whichever one found the song", () => {
    expect(combineLookups(itunes, notFound)).toEqual(itunes);
    expect(combineLookups(notFound, musicbrainz)).toEqual(musicbrainz);
    expect(combineLookups(failed, musicbrainz)).toEqual(musicbrainz);
    expect(combineLookups(itunes, failed)).toEqual(itunes);
  });

  it("should say not found when neither found it", () => {
    expect(combineLookups(notFound, notFound)).toEqual({ status: "not_found" });
  });

  it("should report an error when one failed and the other found nothing", () => {
    expect(combineLookups(failed, notFound)).toBe(failed);
    expect(combineLookups(notFound, failed)).toBe(failed);
  });

  it("should prefer the album of its own to a single or compilation", () => {
    const compilation = {
      ...itunes,
      albumName: "Greatest Hits",
      isAlbum: false,
    };
    const single = { ...musicbrainz, releaseYear: 1990, isAlbum: false };

    expect(combineLookups(compilation, musicbrainz)).toEqual(musicbrainz);
    expect(combineLookups(itunes, single)).toEqual(itunes);
  });

  it("should prefer the release that came out first", () => {
    const original = {
      ...musicbrainz,
      albumName: "Special Forces",
      releaseYear: 1979,
    };
    const unknown = { ...musicbrainz, releaseYear: null };

    expect(combineLookups(itunes, original)).toEqual(original);
    expect(combineLookups(itunes, unknown)).toEqual(itunes);
    expect(combineLookups({ ...itunes, releaseYear: null }, original)).toEqual({
      ...itunes,
      releaseYear: null,
    });
  });

  it("should not take an album decades after the song's soundtrack for the original", () => {
    const soundtrack = {
      ...itunes,
      albumName: "Back to the Future",
      releaseYear: 1985,
      isAlbum: false,
    };
    const collection = {
      ...musicbrainz,
      albumName: "Hits of the 80s",
      releaseYear: 2009,
    };

    expect(combineLookups(soundtrack, collection)).toEqual(soundtrack);
    expect(combineLookups(collection, soundtrack)).toEqual(soundtrack);
    expect(
      combineLookups({ ...soundtrack, releaseYear: 2008 }, collection),
    ).toEqual(collection);
    expect(
      combineLookups({ ...soundtrack, releaseYear: null }, collection),
    ).toEqual(collection);
  });

  it("should believe MusicBrainz about two different albums of the same year, but not two other releases", () => {
    const compilation = {
      ...itunes,
      albumName: "Street Grooves",
      releaseYear: 1989,
    };
    const album = {
      ...musicbrainz,
      albumName: "The Biz Never Sleeps",
      releaseYear: 1989,
    };

    expect(combineLookups(compilation, album)).toEqual(album);
    expect(
      combineLookups(
        { ...compilation, isAlbum: false },
        { ...album, isAlbum: false },
      ),
    ).toMatchObject({ source: "itunes" });
  });

  it("should save an album's name without its edition", () => {
    expect(
      combineLookups(
        { ...itunes, albumName: "Wild-Eyed Southern Boys (Deluxe Edition)" },
        notFound,
      ),
    ).toMatchObject({ albumName: "Wild-Eyed Southern Boys" });
    expect(
      combineLookups(
        { ...itunes, albumName: null, releaseYear: null },
        notFound,
      ),
    ).toMatchObject({ albumName: null, releaseYear: null });
  });

  it("should keep the earlier year when both name the same album", () => {
    expect(
      combineLookups(
        {
          ...itunes,
          albumName: "Wild-Eyed Southern Boys (Expanded)",
          releaseYear: 2011,
        },
        { ...musicbrainz, releaseYear: 1981 },
      ),
    ).toMatchObject({ source: "itunes", releaseYear: 1981 });
  });

  it("should treat an iTunes EP and MusicBrainz's name for it as the same album", () => {
    expect(
      combineLookups(
        {
          ...itunes,
          albumName: "Crackers International - EP",
          releaseYear: 1989,
        },
        {
          ...musicbrainz,
          albumName: "Crackers International",
          releaseYear: 1988,
        },
      ),
    ).toMatchObject({
      source: "itunes",
      albumName: "Crackers International - EP",
      releaseYear: 1988,
    });
  });

  it("should not take the other service's year for a different album", () => {
    expect(
      combineLookups(
        { ...itunes, releaseYear: 1990 },
        { ...musicbrainz, albumName: "Another", releaseYear: 1991 },
      ),
    ).toMatchObject({ releaseYear: 1990 });
    expect(
      combineLookups(itunes, { ...musicbrainz, albumName: null }),
    ).toMatchObject({ releaseYear: 1981 });
  });
});

describe("the combined lookup", () => {
  it("should ask both services and settle on one answer", async () => {
    const askItunes = vi.fn(() => Promise.resolve(itunes));
    const askMusicBrainz = vi.fn(() => Promise.resolve(notFound));
    const lookup = createSongLookup({
      itunes: askItunes,
      musicbrainz: askMusicBrainz,
    });

    await expect(lookup(wanted)).resolves.toEqual(itunes);
    expect(askItunes).toHaveBeenCalledWith(wanted);
    expect(askMusicBrainz).toHaveBeenCalledWith(wanted);
  });
});
