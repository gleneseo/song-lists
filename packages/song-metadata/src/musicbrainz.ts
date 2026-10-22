import { SONG_METADATA_SOURCE, SONG_METADATA_STATUS } from "@song-lists/db";
import type { SongLookupResult } from "./result.js";
import {
  chooseMatch,
  isProperAlbum,
  type Candidate,
  type ReleaseKind,
  type WantedSong,
} from "./match.js";
import { createRateLimiter, type RateLimiter } from "./rate-limiter.js";

const SEARCH_URL = "https://musicbrainz.org/ws/2/recording";
const RELEASE_GROUP_URL = "https://musicbrainz.org/ws/2/release-group";
const COVER_ART_URL = "https://coverartarchive.org/release-group";

/** How many recordings to ask for; the best of these is the one we may use. */
const RESULT_LIMIT = 15;

const REQUEST_TIMEOUT_MS = 10_000;

/** MusicBrainz asks callers to stay at about one request a second. */
const MIN_INTERVAL_MS = 1100;

/** How many albums to try for cover art before giving up on the song. */
const MAX_COVER_CHECKS = 3;

/** MusicBrainz turns away callers that don't say who they are. */
const HEADERS = { "User-Agent": "song-lists/1.0 (music catalog lookup)" };

/** Types that make a release something other than the song's own record. */
const EXCLUDED_SECONDARY_TYPES = new Set([
  "Live",
  "Remix",
  "DJ-mix",
  "Demo",
  "Mixtape/Street",
  "Spokenword",
  "Interview",
  "Audiobook",
  "Audio drama",
  "Field recording",
]);

/**
 * Which kinds of release are acceptable at each step. A song on an album or
 * EP is taken from there; only when it isn't on one, from a single or
 * soundtrack; and only then from a compilation.
 */
const KIND_STEPS: ReleaseKind[][] = [
  ["album", "ep"],
  ["album", "ep", "single", "soundtrack"],
  ["album", "ep", "single", "soundtrack", "compilation"],
];

interface MusicBrainzLookupOptions {
  /** Replaceable so tests never reach the network. */
  fetch?: typeof globalThis.fetch;
  /** Shared by every request that should count against the same allowance. */
  limiter?: RateLimiter;
}

/** A song on one release group (all the editions of one album). */
interface ReleaseCandidate extends Candidate {
  albumName: string;
  kind: ReleaseKind;
  recordingId: string;
  releaseGroupId: string;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function yearOrNull(value: unknown): number | null {
  const year = typeof value === "string" ? /^\d{4}/.exec(value)?.[0] : null;

  return year === null || year === undefined ? null : Number(year);
}

/** What sort of release a release group is, or `null` for one we never use. */
function kindOf(group: Record<string, unknown>): ReleaseKind | null {
  const primary = group["primary-type"];
  const secondary = Array.isArray(group["secondary-types"])
    ? (group["secondary-types"] as unknown[])
    : [];

  if (
    secondary.some((type) => EXCLUDED_SECONDARY_TYPES.has(String(type))) ||
    (primary !== "Album" && primary !== "EP" && primary !== "Single")
  ) {
    return null;
  }

  if (secondary.includes("Compilation")) {
    return "compilation";
  }

  if (secondary.includes("Soundtrack")) {
    return "soundtrack";
  }

  return primary === "Single" ? "single" : primary === "EP" ? "ep" : "album";
}

/**
 * The songs on each album, from a recording search: one candidate for each
 * release group, taken from its earliest official release.
 */
function readCandidates(raw: unknown): ReleaseCandidate[] {
  const recordings = asRecord(raw)?.["recordings"];

  if (!Array.isArray(recordings)) {
    return [];
  }

  const found = new Map<string, ReleaseCandidate>();

  for (const recording of recordings.map(asRecord)) {
    const id = textOrNull(recording?.["id"]);
    const title = textOrNull(recording?.["title"]);
    const credit = Array.isArray(recording?.["artist-credit"])
      ? (recording["artist-credit"] as unknown[])
          .map(asRecord)
          .map(
            (part) =>
              (textOrNull(part?.["name"]) ?? "") +
              (textOrNull(part?.["joinphrase"]) ?? ""),
          )
          .join("")
      : "";
    const releases = recording?.["releases"];

    if (
      id === null ||
      title === null ||
      credit === "" ||
      !Array.isArray(releases)
    ) {
      continue;
    }

    for (const release of releases.map(asRecord)) {
      const group = asRecord(release?.["release-group"]);
      const groupId = textOrNull(group?.["id"]);
      const albumName = textOrNull(release?.["title"]);
      const kind = group ? kindOf(group) : null;

      if (
        release?.["status"] !== "Official" ||
        groupId === null ||
        albumName === null ||
        kind === null
      ) {
        continue;
      }

      // A release with no date of its own is no later than the recording's
      // first release, which is the best guess there is for its year.
      const releaseYear =
        yearOrNull(release["date"]) ??
        yearOrNull(recording?.["first-release-date"]);
      const have = found.get(groupId);

      if (have && (have.releaseYear ?? Infinity) <= (releaseYear ?? Infinity)) {
        continue;
      }

      found.set(groupId, {
        title,
        artistName: credit,
        albumName,
        releaseYear,
        kind,
        recordingId: id,
        releaseGroupId: groupId,
      });
    }
  }

  return [...found.values()];
}

function chooseRelease(
  wanted: WantedSong,
  candidates: ReleaseCandidate[],
): ReleaseCandidate | null {
  for (const kinds of KIND_STEPS) {
    const match = chooseMatch(
      wanted,
      candidates.filter(({ kind }) => kinds.includes(kind)),
    );

    if (match) {
      return match;
    }
  }

  return null;
}

/**
 * Looks a song up on MusicBrainz, which knows records that iTunes doesn't
 * sell, with cover art from the Cover Art Archive. The album is chosen by
 * the release's own type (so live albums, remixes and DJ mixes are never
 * mistaken for it), the year is the album's true first release, and a song
 * on an album with no cover art on file counts as not found.
 *
 * The returned function never throws: a service that is down, slow, or
 * answering nonsense comes back as an `error` result.
 */
function createMusicBrainzLookup({
  fetch = globalThis.fetch,
  limiter = createRateLimiter({ minIntervalMs: MIN_INTERVAL_MS }),
}: MusicBrainzLookupOptions = {}): (
  wanted: WantedSong,
) => Promise<SongLookupResult> {
  const send = (url: URL | string, init: RequestInit = {}) =>
    limiter.schedule(() =>
      fetch(url, {
        ...init,
        headers: HEADERS,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
    );

  /**
   * Remembers what was asked about an album, so the next song on it costs
   * nothing -- but not a failure, which is worth asking again.
   */
  const remembered = <T>(
    memory: Map<string, Promise<T>>,
    groupId: string,
    ask: (groupId: string) => Promise<T>,
  ): Promise<T> => {
    const known = memory.get(groupId);

    if (known) {
      return known;
    }

    const asked = ask(groupId);

    memory.set(groupId, asked);
    asked.catch(() => memory.delete(groupId));

    return asked;
  };
  const years = new Map<string, Promise<number | null>>();
  const covers = new Map<string, Promise<boolean>>();

  /** The year the album first came out, or `null` when MusicBrainz won't say. */
  const askFirstReleaseYear = async (groupId: string) => {
    const response = await send(`${RELEASE_GROUP_URL}/${groupId}?fmt=json`);

    return response.ok
      ? yearOrNull(asRecord(await response.json())?.["first-release-date"])
      : null;
  };

  /** Whether the Cover Art Archive has a front cover for the album. */
  const askHasCover = async (groupId: string) => {
    const response = await send(`${COVER_ART_URL}/${groupId}/front`, {
      method: "HEAD",
      redirect: "manual",
    });

    if (response.status === 404) {
      return false;
    }

    if (response.status < 300 || response.status >= 400) {
      throw new Error(
        `The Cover Art Archive answered ${String(response.status)}.`,
      );
    }

    return true;
  };

  const firstReleaseYear = (groupId: string) =>
    remembered(years, groupId, askFirstReleaseYear);
  const hasCover = (groupId: string) =>
    remembered(covers, groupId, askHasCover);

  return async (wanted) => {
    const url = new URL(SEARCH_URL);

    url.search = new URLSearchParams({
      query: `recording:"${wanted.title.replaceAll('"', " ")}" AND artist:"${wanted.artistName.replaceAll('"', " ")}"`,
      fmt: "json",
      limit: String(RESULT_LIMIT),
    }).toString();

    try {
      const response = await send(url);

      if (!response.ok) {
        return {
          status: SONG_METADATA_STATUS.ERROR,
          message: `MusicBrainz answered ${String(response.status)}.`,
        };
      }

      let candidates = readCandidates(await response.json());

      for (let tries = 0; tries < MAX_COVER_CHECKS; tries += 1) {
        const match = chooseRelease(wanted, candidates);

        if (!match) {
          break;
        }

        if (await hasCover(match.releaseGroupId)) {
          const year =
            (await firstReleaseYear(match.releaseGroupId)) ??
            match.releaseYear ??
            null;

          return {
            status: SONG_METADATA_STATUS.MATCHED,
            source: SONG_METADATA_SOURCE.MUSICBRAINZ,
            sourceTrackId: match.recordingId,
            artworkUrl: `${COVER_ART_URL}/${match.releaseGroupId}/front`,
            albumName: match.albumName,
            releaseYear: year,
            isAlbum: isProperAlbum(wanted, match),
          };
        }

        candidates = candidates.filter(
          ({ releaseGroupId }) => releaseGroupId !== match.releaseGroupId,
        );
      }

      return { status: SONG_METADATA_STATUS.NOT_FOUND };
    } catch (error) {
      return {
        status: SONG_METADATA_STATUS.ERROR,
        message:
          error instanceof Error
            ? error.message
            : "The MusicBrainz lookup failed.",
      };
    }
  };
}

export {
  createMusicBrainzLookup,
  MIN_INTERVAL_MS as MUSICBRAINZ_MIN_INTERVAL_MS,
};
export type { MusicBrainzLookupOptions };
