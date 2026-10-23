import { SONG_METADATA_SOURCE, SONG_METADATA_STATUS } from "@song-lists/db";
import type { SongLookupResult } from "./result.js";
import {
  chooseMatch,
  isProperAlbum,
  simplify,
  type Candidate,
  type ReleaseKind,
  type WantedSong,
} from "./match.js";
import { createRateLimiter, type RateLimiter } from "./rate-limiter.js";

const SEARCH_URL = "https://musicbrainz.org/ws/2/recording";
const RELEASE_GROUP_URL = "https://musicbrainz.org/ws/2/release-group";
const COVER_ART_URL = "https://coverartarchive.org/release-group";

/** How many recordings to ask for; the best of these is the one we may use. */
const RESULT_LIMIT = 30;

/**
 * Narrows a search to the song on official albums that aren't concerts. A song
 * with hundreds of live and bootleg recordings has its studio one far down an
 * ordinary search, however many results are asked for.
 */
const OFFICIAL_ALBUMS_ONLY =
  " AND status:official AND primarytype:album AND NOT secondarytype:live";

/** How many more to ask for, past the first, when those had no album of the song's own. */
const MORE_RESULTS = 70;

const REQUEST_TIMEOUT_MS = 10_000;

/** MusicBrainz asks callers to stay at about one request a second. */
const MIN_INTERVAL_MS = 1100;

/** How many albums to try for cover art before giving up on the song. */
const MAX_COVER_CHECKS = 3;

/** How many albums are looked up for the year they first came out. */
const MAX_YEAR_CHECKS = 6;

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
 * Which kinds of release are acceptable at each step. A song on an album, EP
 * or soundtrack is taken from there; only when it isn't on one, from a
 * single; and only then from a compilation.
 */
const ALBUM_KINDS: ReleaseKind[] = ["album", "ep", "soundtrack"];

/** How many years before an album a song's single must have come out for the single to be the original. */
const SINGLE_LEAD_YEARS = 10;

const KIND_STEPS: ReleaseKind[][] = [
  ["album", "ep", "soundtrack"],
  ["album", "ep", "soundtrack", "single"],
  ["album", "ep", "soundtrack", "single", "compilation"],
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
  /** Set when the release has no date, so the year is only the recording's first release. */
  yearGuessed: boolean;
}

/** A song on a release group that something has dated. */
type DatedCandidate = ReleaseCandidate & { releaseYear: number };

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

/** Whether a release is credited to Various Artists, as a compilation is. */
function isByVariousArtists(release: Record<string, unknown> | null) {
  const credit = release?.["artist-credit"];

  return (
    Array.isArray(credit) &&
    credit
      .map(asRecord)
      .some((part) =>
        /^various( artists)?$/i.test(textOrNull(part?.["name"]) ?? ""),
      )
  );
}

/** The words of a name that tell one act from another. */
function namingWords(name: string): string[] {
  return simplify(name)
    .split(" ")
    .filter((word) => word.length > 2 && word !== "the" && word !== "and");
}

/**
 * Whether a release is credited to some other act than the one wanted, as a
 * cover or a sample of the song on someone else's album is: it names no word
 * of the act and isn't a Various Artists compilation.
 */
function isCreditedElsewhere(
  release: Record<string, unknown> | null,
  wantedArtist: string,
): boolean {
  const credit = release?.["artist-credit"];

  if (!Array.isArray(credit) || isByVariousArtists(release)) {
    return false;
  }

  const named = credit
    .map(asRecord)
    .flatMap((part) => namingWords(textOrNull(part?.["name"]) ?? ""));
  const wanted = namingWords(wantedArtist);

  return (
    named.length > 0 &&
    wanted.length > 0 &&
    !wanted.some((word) => named.includes(word))
  );
}

/** Whether a release states a status other than official; one that states none is let through. */
function isUnofficial(release: Record<string, unknown> | null) {
  const status = release?.["status"];

  return typeof status === "string" && status !== "Official";
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

  // A film's soundtrack is usually entered as a compilation too, being the
  // work of several acts, but it is where the film's songs first came out.
  if (secondary.includes("Soundtrack")) {
    return "soundtrack";
  }

  if (secondary.includes("Compilation")) {
    return "compilation";
  }

  return primary === "Single" ? "single" : primary === "EP" ? "ep" : "album";
}

function recordingsOf(raw: unknown): unknown[] {
  const recordings = asRecord(raw)?.["recordings"];

  return Array.isArray(recordings) ? recordings : [];
}

/**
 * The songs on each album, from a recording search: one candidate for each
 * release group, taken from its earliest official release.
 */
function readCandidates(
  recordings: unknown[],
  wanted: WantedSong,
): ReleaseCandidate[] {
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
      const stated = group ? kindOf(group) : null;
      // An album credited to Various Artists is a compilation, whatever type
      // it was entered as.
      const kind =
        stated === "album" && isByVariousArtists(release)
          ? "compilation"
          : stated;

      if (
        release === null ||
        isUnofficial(release) ||
        (stated !== "soundtrack" &&
          kind !== "compilation" &&
          isCreditedElsewhere(release, wanted.artistName)) ||
        groupId === null ||
        albumName === null ||
        kind === null
      ) {
        continue;
      }

      // A release with no date of its own is no later than the recording's
      // first release, which is the best guess there is for its year.
      const ownYear = yearOrNull(release["date"]);
      const releaseYear =
        ownYear ?? yearOrNull(recording?.["first-release-date"]);
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
        yearGuessed: ownYear === null,
      });
    }
  }

  return [...found.values()];
}

/**
 * The artist part of a search: the name as given, or just its first and last
 * telling words (not "the" or "and"), so that a credit with a nickname in the middle ("Damian Jr. Gong
 * Marley") is found too.
 */
function artistQuery(artistName: string): string {
  const exact = `artist:"${artistName.replaceAll('"', " ")}"`;
  const words = namingWords(artistName);
  const first = words[0];
  const last = words.at(-1);

  return words.length < 2 || first === undefined || last === undefined
    ? exact
    : `(${exact} OR artist:(${first} AND ${last}))`;
}

/** The year a candidate came out, or a year that never comes when nothing says. */
function yearOf({ releaseYear }: ReleaseCandidate): number {
  return releaseYear ?? Infinity;
}

function chooseRelease<T extends DatedCandidate>(
  wanted: WantedSong,
  candidates: T[],
): T | null {
  for (const kinds of KIND_STEPS) {
    const match = chooseMatch(
      wanted,
      candidates.filter(({ kind }) => kinds.includes(kind)),
    );

    if (match) {
      // A song first sold as a single long before any album it ended up on
      // (a 1965 single, a soundtrack of 1987) never was an album's song.
      const single = chooseMatch(
        wanted,
        candidates.filter(({ kind }) => kind === "single"),
      );

      return single &&
        match.kind !== "single" &&
        single.releaseYear + SINGLE_LEAD_YEARS <= match.releaseYear
        ? single
        : match;
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
  const groups = new Map<
    string,
    Promise<{ year: number | null; title: string | null }>
  >();
  const covers = new Map<string, Promise<boolean>>();

  /**
   * The album's own name and the year it first came out, as far as
   * MusicBrainz will say: a later edition may carry another name ("The Album
   * Formerly Known as Full Length LP" is "Full Length L.P.", of 1991).
   */
  const askGroup = async (groupId: string) => {
    const response = await send(`${RELEASE_GROUP_URL}/${groupId}?fmt=json`);
    const group = response.ok ? asRecord(await response.json()) : null;

    return {
      year: yearOrNull(group?.["first-release-date"]),
      title: textOrNull(group?.["title"]),
    };
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

  const group = (groupId: string) => remembered(groups, groupId, askGroup);
  const hasCover = (groupId: string) =>
    remembered(covers, groupId, askHasCover);

  /**
   * Gives the albums the year they first came out, which can be long before
   * the release that was found: an album found on a 2012 reissue, or guessed at
   * 2014 for lack of a date, would lose to a 2009 collection or a 2001 EP,
   * though it came out in 1989 or 1997.
   */
  const dateByAlbums = async (
    candidates: ReleaseCandidate[],
  ): Promise<DatedCandidate[]> => {
    const asked = candidates
      .filter(
        ({ kind, yearGuessed }) => yearGuessed || ALBUM_KINDS.includes(kind),
      )
      .toSorted((a, b) => yearOf(a) - yearOf(b))
      .slice(0, MAX_YEAR_CHECKS);
    const years = new Map(
      await Promise.all(
        asked.map(
          async ({ releaseGroupId }) =>
            [releaseGroupId, (await group(releaseGroupId)).year] as const,
        ),
      ),
    );

    // An album nothing dates at all is no better than a guess at the song's record.
    return candidates
      .map((candidate) => ({
        ...candidate,
        releaseYear:
          years.get(candidate.releaseGroupId) ?? candidate.releaseYear,
      }))
      .filter(
        (candidate): candidate is DatedCandidate =>
          candidate.releaseYear !== null && candidate.releaseYear !== undefined,
      );
  };

  const searchUrl = (
    wanted: WantedSong,
    offset: number,
    limit: number,
    officialAlbumsOnly = false,
  ) => {
    const url = new URL(SEARCH_URL);

    url.search = new URLSearchParams({
      query: `recording:"${wanted.title.replaceAll('"', " ")}" AND ${artistQuery(wanted.artistName)}${officialAlbumsOnly ? OFFICIAL_ALBUMS_ONLY : ""}`,
      fmt: "json",
      limit: String(limit),
      ...(offset > 0 ? { offset: String(offset) } : {}),
    }).toString();

    return url;
  };

  /**
   * More recordings for a song whose results had only singles and collections.
   * A search that can't be had counts as no more.
   */
  const askRecordings = async (url: URL): Promise<unknown[]> => {
    try {
      const response = await send(url);

      return response.ok ? recordingsOf(await response.json()) : [];
    } catch {
      return [];
    }
  };

  return async (wanted) => {
    try {
      const response = await send(searchUrl(wanted, 0, RESULT_LIMIT));

      if (!response.ok) {
        return {
          status: SONG_METADATA_STATUS.ERROR,
          message: `MusicBrainz answered ${String(response.status)}.`,
        };
      }

      let recordings = recordingsOf(await response.json());
      let candidates = await dateByAlbums(readCandidates(recordings, wanted));

      // With no album of the song's own yet, look further: first at the next
      // results, then at the official albums alone.
      for (const next of [
        searchUrl(wanted, RESULT_LIMIT, MORE_RESULTS),
        searchUrl(wanted, 0, RESULT_LIMIT, true),
      ]) {
        const early = chooseRelease(wanted, candidates);

        if (early && isProperAlbum(wanted, early)) {
          break;
        }

        const more = await askRecordings(next);

        if (more.length > 0) {
          recordings = [...recordings, ...more];
          candidates = await dateByAlbums(readCandidates(recordings, wanted));
        }
      }

      for (let tries = 0; tries < MAX_COVER_CHECKS; tries += 1) {
        const match = chooseRelease(wanted, candidates);

        if (!match) {
          break;
        }

        if (await hasCover(match.releaseGroupId)) {
          const album = await group(match.releaseGroupId);

          return {
            status: SONG_METADATA_STATUS.MATCHED,
            source: SONG_METADATA_SOURCE.MUSICBRAINZ,
            sourceTrackId: match.recordingId,
            artworkUrl: `${COVER_ART_URL}/${match.releaseGroupId}/front`,
            albumName: album.title ?? match.albumName,
            releaseYear: album.year ?? match.releaseYear,
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
