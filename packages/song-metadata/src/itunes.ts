import { SONG_METADATA_SOURCE, SONG_METADATA_STATUS } from "@song-lists/db";
import {
  chooseMatch,
  isProperAlbum,
  simplify,
  type WantedSong,
} from "./match.js";
import type { SongLookupResult } from "./result.js";
import { createRateLimiter, type RateLimiter } from "./rate-limiter.js";

const SEARCH_URL = "https://itunes.apple.com/search";
const LOOKUP_URL = "https://itunes.apple.com/lookup";

/** How many results to ask for; the best of these is the one we may use. */
const RESULT_LIMIT = 15;

/**
 * A song iTunes' search won't show can still be on an album it lists in full.
 * For one it can't find, the artist's own songs are searched for, and the
 * track lists of up to this many of the albums they are on are read.
 */
const MAX_ALBUMS_TO_READ = 3;
const ARTIST_RESULT_LIMIT = 50;

const REQUEST_TIMEOUT_MS = 10_000;

/** Apple turns away callers past roughly 20 requests a minute. */
const MIN_INTERVAL_MS = 3000;

interface ItunesLookupOptions {
  /** Replaceable so tests never reach the network. */
  fetch?: typeof globalThis.fetch;
  /** Shared by every lookup that should count against the same allowance. */
  limiter?: RateLimiter;
}

/** The parts of an iTunes search result that we use. */
interface ItunesTrack {
  trackId: number;
  /** The album's ID, to read its whole track list. */
  albumId: number | null;
  title: string;
  artistName: string;
  albumName: string | null;
  artworkUrl: string | null;
  releaseYear: number | null;
  /** The full date, as the service gives it, to tell releases of one year apart. */
  releaseDate: string | null;
  /** Whether the album is credited to Various Artists, as a compilation is. */
  variousArtists: boolean;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function yearOrNull(value: unknown): number | null {
  const year = typeof value === "string" ? Number(value.slice(0, 4)) : NaN;

  return Number.isInteger(year) ? year : null;
}

/** Reads one search result, or `null` if it lacks what makes it a song. */
function readTrack(raw: unknown): ItunesTrack | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const title = textOrNull(record["trackName"]);
  const artistName = textOrNull(record["artistName"]);

  if (
    typeof record["trackId"] !== "number" ||
    title === null ||
    artistName === null
  ) {
    return null;
  }

  return {
    trackId: record["trackId"],
    albumId:
      typeof record["collectionId"] === "number"
        ? record["collectionId"]
        : null,
    title,
    artistName,
    albumName: textOrNull(record["collectionName"]),
    artworkUrl: textOrNull(record["artworkUrl100"]),
    releaseYear: yearOrNull(record["releaseDate"]),
    releaseDate: textOrNull(record["releaseDate"]),
    variousArtists: /^various artists$/i.test(
      textOrNull(record["collectionArtistName"]) ?? "",
    ),
  };
}

/** The songs in an answer from iTunes, or none when it isn't one. */
function readTracks(body: unknown): ItunesTrack[] {
  const results = (body as { results?: unknown } | null)?.results;

  return Array.isArray(results)
    ? results
        .map(readTrack)
        .filter((track): track is ItunesTrack => track !== null)
    : [];
}

/**
 * Looks a song up on iTunes by title and artist, and says whether iTunes has
 * it and what it shows for it.
 *
 * The returned function never throws: a service that is down, slow, or
 * answering nonsense comes back as an `error` result, so adding a song never
 * depends on iTunes being up.
 */
function createItunesLookup({
  fetch = globalThis.fetch,
  limiter = createRateLimiter({ minIntervalMs: MIN_INTERVAL_MS }),
}: ItunesLookupOptions = {}): (
  wanted: WantedSong,
) => Promise<SongLookupResult> {
  const send = (url: URL) =>
    limiter.schedule(() =>
      fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
    );

  /** What iTunes answers to a request, or nothing when it can't be had: a look further is only a bonus. */
  const askTracks = async (url: URL): Promise<ItunesTrack[]> => {
    try {
      const response = await send(url);

      return response.ok ? readTracks(await response.json()) : [];
    } catch {
      return [];
    }
  };

  /**
   * The songs on the albums an artist has on iTunes. Its search leaves some
   * songs out that their albums do list ("Finish Em" is track 15 of The
   * Succession but is never found by name), so the artist's songs are
   * searched for and the track lists of the albums they are on are read.
   */
  const readArtistsAlbums = async (
    wanted: WantedSong,
    found: ItunesTrack[],
  ): Promise<ItunesTrack[]> => {
    const artist = simplify(wanted.artistName);
    const searchUrl = new URL(SEARCH_URL);

    searchUrl.search = new URLSearchParams({
      term: wanted.artistName,
      media: "music",
      entity: "song",
      limit: String(ARTIST_RESULT_LIMIT),
    }).toString();

    // Only the artist's own albums: one credited to Various Artists, where the
    // artist is one of several, is a compilation, not their record.
    const theirs = [...found, ...(await askTracks(searchUrl))].filter(
      (track) => simplify(track.artistName) === artist && !track.variousArtists,
    );
    const albumCounts = new Map<number, number>();

    for (const { albumId } of theirs) {
      if (albumId !== null) {
        albumCounts.set(albumId, (albumCounts.get(albumId) ?? 0) + 1);
      }
    }

    const albumIds = [...albumCounts]
      .toSorted(([, a], [, b]) => b - a)
      .slice(0, MAX_ALBUMS_TO_READ)
      .map(([albumId]) => albumId);
    const lists: ItunesTrack[][] = [];

    // One at a time, since each one waits its turn with iTunes anyway.
    for (const albumId of albumIds) {
      const url = new URL(LOOKUP_URL);

      url.search = new URLSearchParams({
        id: String(albumId),
        entity: "song",
      }).toString();
      lists.push(await askTracks(url));
    }

    return lists.flat();
  };

  return async (wanted) => {
    const url = new URL(SEARCH_URL);

    url.search = new URLSearchParams({
      term: `${wanted.artistName} ${wanted.title}`,
      media: "music",
      entity: "song",
      limit: String(RESULT_LIMIT),
    }).toString();

    try {
      const response = await send(url);

      if (!response.ok) {
        return {
          status: SONG_METADATA_STATUS.ERROR,
          message: `iTunes answered ${String(response.status)}.`,
        };
      }

      const body = (await response.json()) as { results?: unknown };

      if (!Array.isArray(body.results)) {
        return {
          status: SONG_METADATA_STATUS.ERROR,
          message: "iTunes answered in a form we don't recognize.",
        };
      }

      const tracks = readTracks(body);
      // Not found by name: look at the albums the artist has instead. This
      // never changes a song that was found, only one that wasn't.
      const match =
        chooseMatch(wanted, tracks) ??
        chooseMatch(wanted, [
          ...tracks,
          ...(await readArtistsAlbums(wanted, tracks)),
        ]);

      return match
        ? {
            status: SONG_METADATA_STATUS.MATCHED,
            source: SONG_METADATA_SOURCE.ITUNES,
            sourceTrackId: String(match.trackId),
            matchedTitle: match.title,
            matchedArtistName: match.artistName,
            artworkUrl: match.artworkUrl,
            albumName: match.albumName,
            releaseYear: match.releaseYear,
            isAlbum: isProperAlbum(wanted, match),
          }
        : { status: SONG_METADATA_STATUS.NOT_FOUND };
    } catch (error) {
      return {
        status: SONG_METADATA_STATUS.ERROR,
        message:
          error instanceof Error ? error.message : "The iTunes lookup failed.",
      };
    }
  };
}

export { createItunesLookup, MIN_INTERVAL_MS as ITUNES_MIN_INTERVAL_MS };
export type { ItunesLookupOptions };
