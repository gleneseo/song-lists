/** A song as it was asked for: the title and artist we hold for it. */
interface WantedSong {
  title: string;
  artistName: string;
}

/** A song as an outside service described it. */
interface Candidate {
  title: string;
  artistName: string;
  /** The album, single or compilation it appears on, when the service says. */
  albumName?: string | null | undefined;
}

/** Below this, the titles are treated as different songs. */
const MIN_TITLE_SIMILARITY = 0.85;

/**
 * Below this, the artists are treated as different acts. It's stricter than
 * the title bar: a wrong artist puts someone else's face on a song.
 */
const MIN_ARTIST_SIMILARITY = 0.9;

/**
 * Wording that gives away a tribute act, karaoke track, or soundalike
 * recording. Artists who keep their catalog off the big services (and the
 * services' tribute-band stand-ins that fill the gap) are better shown
 * nothing than one of these.
 */
const IMITATION_PATTERN =
  /\b(tribute|karaoke|cover band|made famous|originally performed|in the style of|lullaby renditions|rockabye baby)\b/i;

/** Wording that marks a recording as a different take on the song itself. */
const VERSION_PATTERN = /\b(instrumental|live|karaoke|acapella|a cappella)\b/i;

function stripAccents(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/**
 * Reduces a title or artist to the bare words it's made of, so differences
 * that don't change which song it is (case, punctuation, "&" vs "and", a
 * trailing "(2021 Remaster)" or "- Single Version") don't count against a
 * match.
 */
function simplify(text: string): string {
  const plain = stripAccents(text).toLowerCase().trim();
  const withoutVersion = plain
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s[-–—]\s.*$/, " ");
  const words = (value: string) =>
    value
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Names made only of symbols or notes (such as "!!!") would otherwise
  // vanish; compare them as written.
  return words(withoutVersion) || words(plain) || plain;
}

function simplifyArtist(name: string): string {
  return simplify(name).replace(/^the /, "");
}

/* eslint-disable @typescript-eslint/no-non-null-assertion -- every index is bounded by the lengths the loops run to */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];

    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }

    previous = current;
  }

  return previous[b.length]!;
}
/* eslint-enable @typescript-eslint/no-non-null-assertion */

/** From 0 (nothing alike) to 1 (the same once simplified). */
function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);

  return longest === 0 ? 1 : 1 - editDistance(a, b) / longest;
}

function scoreCandidate(
  wanted: WantedSong,
  candidate: Candidate,
): { title: number; artist: number } {
  return {
    title: similarity(simplify(wanted.title), simplify(candidate.title)),
    artist: similarity(
      simplifyArtist(wanted.artistName),
      simplifyArtist(candidate.artistName),
    ),
  };
}

function isImitation(wanted: WantedSong, candidate: Candidate): boolean {
  // An act (or song) that really is called a tribute isn't an imitation of
  // anything.
  if (
    IMITATION_PATTERN.test(wanted.artistName) ||
    IMITATION_PATTERN.test(wanted.title)
  ) {
    return false;
  }

  return [candidate.artistName, candidate.albumName].some((part) =>
    IMITATION_PATTERN.test(part ?? ""),
  );
}

/**
 * How far a candidate's version of the song is from the plain studio
 * recording: 0 for it, 1 for an instrumental, live, or karaoke take that
 * wasn't asked for. Their artwork belongs to a different release.
 */
function versionPenalty(wanted: WantedSong, candidate: Candidate): number {
  return VERSION_PATTERN.test(candidate.title) &&
    !VERSION_PATTERN.test(wanted.title)
    ? 1
    : 0;
}

/**
 * Picks the candidate that is the wanted song, or `null` when none of them
 * is close enough to be sure. Showing nothing beats showing the wrong song,
 * so this errs toward `null`.
 *
 * Candidates must agree on both title and artist, and tribute acts and
 * karaoke tracks are never chosen. Among those left, plain studio versions
 * come before instrumental or live ones, then the closest match wins, then
 * the service's own ordering.
 */
function chooseMatch<T extends Candidate>(
  wanted: WantedSong,
  candidates: readonly T[],
): T | null {
  const acceptable = candidates
    .map((candidate, position) => ({
      candidate,
      position,
      score: scoreCandidate(wanted, candidate),
    }))
    .filter(
      ({ candidate, score }) =>
        score.title >= MIN_TITLE_SIMILARITY &&
        score.artist >= MIN_ARTIST_SIMILARITY &&
        !isImitation(wanted, candidate),
    );

  acceptable.sort(
    (a, b) =>
      versionPenalty(wanted, a.candidate) -
        versionPenalty(wanted, b.candidate) ||
      b.score.title + b.score.artist - (a.score.title + a.score.artist) ||
      a.position - b.position,
  );

  return acceptable[0]?.candidate ?? null;
}

export { chooseMatch, simplify };
export type { Candidate, WantedSong };
