import { SONG_METADATA_SOURCE, SONG_METADATA_STATUS } from "@song-lists/db";
import { chooseMatch, type WantedSong } from "./match.js";
import { createRateLimiter, type RateLimiter } from "./rate-limiter.js";

const SEARCH_URL = "https://itunes.apple.com/search";

/** How many results to ask for; the best of these is the one we may use. */
const RESULT_LIMIT = 15;

const REQUEST_TIMEOUT_MS = 10_000;

/** Apple turns away callers past roughly 20 requests a minute. */
const MIN_INTERVAL_MS = 3000;

/** What a lookup found out about a song. */
type SongLookupResult =
  | {
      status: typeof SONG_METADATA_STATUS.MATCHED;
      source: typeof SONG_METADATA_SOURCE.ITUNES;
      sourceTrackId: string;
      artworkUrl: string | null;
      albumName: string | null;
      releaseYear: number | null;
    }
  | { status: typeof SONG_METADATA_STATUS.NOT_FOUND }
  | { status: typeof SONG_METADATA_STATUS.ERROR; message: string };

interface ItunesLookupOptions {
  /** Replaceable so tests never reach the network. */
  fetch?: typeof globalThis.fetch;
  /** Shared by every lookup that should count against the same allowance. */
  limiter?: RateLimiter;
}

/** The parts of an iTunes search result that we use. */
interface ItunesTrack {
  trackId: number;
  title: string;
  artistName: string;
  albumName: string | null;
  artworkUrl: string | null;
  releaseYear: number | null;
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
    title,
    artistName,
    albumName: textOrNull(record["collectionName"]),
    artworkUrl: textOrNull(record["artworkUrl100"]),
    releaseYear: yearOrNull(record["releaseDate"]),
  };
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
  return async (wanted) => {
    const url = new URL(SEARCH_URL);

    url.search = new URLSearchParams({
      term: `${wanted.artistName} ${wanted.title}`,
      media: "music",
      entity: "song",
      limit: String(RESULT_LIMIT),
    }).toString();

    try {
      const response = await limiter.schedule(() =>
        fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
      );

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

      const tracks = body.results
        .map(readTrack)
        .filter((track): track is ItunesTrack => track !== null);
      const match = chooseMatch(wanted, tracks);

      return match
        ? {
            status: SONG_METADATA_STATUS.MATCHED,
            source: SONG_METADATA_SOURCE.ITUNES,
            sourceTrackId: String(match.trackId),
            artworkUrl: match.artworkUrl,
            albumName: match.albumName,
            releaseYear: match.releaseYear,
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
export type { ItunesLookupOptions, SongLookupResult };
