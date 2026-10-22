/** A song as it was asked for: the title and artist we hold for it. */
interface WantedSong {
  title: string;
  artistName: string;
}

/** What sort of release a service says a candidate is on, when it says. */
type ReleaseKind = "album" | "ep" | "single" | "soundtrack" | "compilation";

/** A song as an outside service described it. */
interface Candidate {
  title: string;
  artistName: string;
  /** The album, single or compilation it appears on, when the service says. */
  albumName?: string | null | undefined;
  /** The year the song came out, when the service says. */
  releaseYear?: number | null | undefined;
  /**
   * What sort of release it is, for a service that says so outright. Without
   * it, the sort is read from the album's name.
   */
  kind?: ReleaseKind | undefined;
}

/** Below this, the titles are treated as different songs. */
const MIN_TITLE_SIMILARITY = 0.85;

/**
 * Below this, the artists are treated as different acts. It's stricter than
 * the title bar: a wrong artist puts someone else's face on a song.
 */
const MIN_ARTIST_SIMILARITY = 0.9;

/** How close the artist counts as being when the credit is the same act with a backing band. */
const SAME_ACT_ARTIST_SIMILARITY = 0.95;

/** For an artist who is only part of the credit, the title must be this close to be sure. */
const MIN_COLLABORATION_TITLE_SIMILARITY = 0.95;

/** With only concert recordings to go on, one this many years before the rest is taken for the original. */
const LIVE_DEBUT_GAP_YEARS = 5;

/**
 * Matches this close to the best one count as equally good, so that a tiny
 * difference in spelling doesn't outweigh a better album.
 */
const CLOSE_ENOUGH = 0.1;

/**
 * Wording that gives away a tribute act, karaoke track, or soundalike
 * recording. Artists who keep their catalog off the big services (and the
 * services' tribute-band stand-ins that fill the gap) are better shown
 * nothing than one of these.
 */
const IMITATION_PATTERN =
  /\b(tribute|karaoke|cover band|made famous|originally performed|in the style of|lullaby renditions|rockabye baby)\b/i;

/**
 * Wording that marks an album as a collection of an artist's songs rather
 * than a record in its own right (including a box set named for the years it
 * spans), a box set, remakes recorded later, or remixes. Their art is a compilation's, not the song's, so an album that
 * isn't one is preferred when a song is on both. A soundtrack isn't one: for
 * a song written for a film it is the original release.
 */
const COMPILATION_PATTERN =
  /\b(greatest hits|best of|the very best|anthology|collection|essentials?|definitive|complete|ultimate|number ones|hits|gold|platinum|classics|singles|compilation|retrospective|best|inspired by|box(ed)?|rarities|b-sides|demos|vault|re-?recorded|remix(es|ed)?|mixes)\b|\b\d{4}\s*[–-]\s*\d{2,4}\b/i;

/**
 * How a service labels a release that is a single rather than an album: "7 (E
 * Flat Version) - Single".
 */
const SINGLE_PATTERN = /\s-\s*single$|[([]single[)\]]$/i;

/**
 * How a service labels an EP, which is sometimes a mini-album and sometimes
 * a single with extras. It's judged by its year like an album, but comes
 * after an album of the same year.
 */
const EP_PATTERN = /\s-\s*ep$|[([]ep[)\]]$/i;

/** Wording that marks an album as the music of a film, show, or cast. */
const SOUNDTRACK_PATTERN =
  /\b(soundtrack|motion picture|music from|original (cast|score))\b/i;

/** Wording that marks an album as a recording of a concert. */
const LIVE_ALBUM_PATTERN =
  /^live$|[([][^)\]]*\blive\b[^)\]]*[)\]]|\blive (at|in)\b/i;

/** A four-digit year, or the two-digit one at the end of a date like 4/26/08. */
const NAMED_YEAR_PATTERN = /\b(?:19|20)\d{2}\b|\b\d{1,2}\/\d{1,2}\/(\d{2})\b/g;

/** Wording that marks a song as a remake the artist recorded later, in the title or the album's name. */
const RERECORDED_WORDING =
  "re-?record(ed|ing)s?|taylor['’]s version|\\d+(st|nd|rd|th) anniversary (version|mix|recording)";

/** Wording that marks a recording as a different take on the song itself. */
const VERSION_PATTERN = new RegExp(
  `\\b(instrumental|live|karaoke|acapella|a cappella|${RERECORDED_WORDING})\\b`,
  "i",
);

/**
 * Wording that marks an instrumental, karaoke, a cappella, or re-recorded
 * take: never the song people mean, and with art of a release it wasn't on.
 */
const BACKING_PATTERN = new RegExp(
  `\\b(instrumentals?|karaoke|acapella|a cappella|${RERECORDED_WORDING})\\b`,
  "i",
);

/** Wording that marks a track as a live recording. */
const LIVE_PATTERN = /\blive\b/i;

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
      .replace(/(^|\s)['’]?n['’]?(?=\s|$)/g, "$1and")
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Names made only of symbols or notes (such as "!!!") would otherwise
  // vanish; compare them as written.
  return words(withoutVersion) || words(plain) || plain;
}

/** Words that join the names of acts that appear together. */
const ACT_SEPARATOR =
  /\s*(?:,|&|\+|\band\b|\bx\b|\bfeat\.?|\bfeaturing\b|\bwith\b|\bvs\.?)\s*/i;

/** Drops a leading "the" and a trailing "band", which sources add or leave off freely. */
function plainAct(act: string): string {
  return act
    .replace(/^the /, "")
    .replace(/(.) band$/, "$1")
    .trim();
}

/**
 * The ways a name can be read for comparison: as written, and without a
 * nickname in quotes (`Damian "Jr. Gong" Marley` is just Damian Marley to
 * most sources).
 */
function artistReadings(name: string): string[] {
  const readings = [plainAct(simplify(name))];
  const withoutNickname = name.replace(/["“”][^"“”]*["“”]/g, " ");

  if (withoutNickname !== name) {
    readings.push(plainAct(simplify(withoutNickname)));
  }

  return readings;
}

function artistSimilarity(a: string, b: string): number {
  return Math.max(
    ...artistReadings(a).flatMap((reading) =>
      artistReadings(b).map((other) => similarity(reading, other)),
    ),
  );
}

/** The separate acts named in an artist credit, as written. */
function rawActsOf(name: string): string[] {
  return name
    .split(ACT_SEPARATOR)
    .map((act) => act.trim())
    .filter((act) => act !== "");
}

/**
 * How two credits that aren't the same name relate, when one names only acts
 * that the other names too:
 *
 * - `same`: the other credit adds nothing but a backing band ("Prince & The
 *   New Power Generation", "Elvis Costello & The Attractions"), so it is the
 *   same act under another name.
 * - `partial`: it adds other people, as a duo's song credited to just one of
 *   them, or a track "with" a guest.
 *
 * `null` when neither credit is part of the other.
 */
function sharedActs(a: string, b: string): "same" | "partial" | null {
  const [fewer, more] = [rawActsOf(a), rawActsOf(b)].toSorted(
    (x, y) => x.length - y.length,
  ) as [string[], string[]];
  const named = (acts: string[]) => acts.map((act) => plainAct(simplify(act)));
  const includes = (acts: string[], act: string) =>
    named(acts).some(
      (other) =>
        similarity(plainAct(simplify(act)), other) >= MIN_ARTIST_SIMILARITY,
    );

  if (fewer.length === 0 || !fewer.every((act) => includes(more, act))) {
    return null;
  }

  const added = more.filter((act) => !includes(fewer, act));

  return added.every((act) => /^the\s/i.test(act)) ? "same" : "partial";
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
): { title: number; artist: number; partial: boolean } {
  const title = similarity(simplify(wanted.title), simplify(candidate.title));
  const artist = artistSimilarity(wanted.artistName, candidate.artistName);
  const shared =
    artist < MIN_ARTIST_SIMILARITY
      ? sharedActs(wanted.artistName, candidate.artistName)
      : null;

  if (shared === "same") {
    return { title, artist: SAME_ACT_ARTIST_SIMILARITY, partial: false };
  }

  // The artists only partly overlap (one is part of the other's credit), which
  // is good enough only when the song is plainly the same one.
  const partial =
    shared === "partial" && title >= MIN_COLLABORATION_TITLE_SIMILARITY;

  return {
    title,
    artist: partial ? MIN_ARTIST_SIMILARITY : artist,
    partial,
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
 * Which recording of the song a candidate is, when it isn't the one asked
 * for: an instrumental or karaoke take (`backing`), or a concert recording
 * (`live`). Their artwork belongs to a different release.
 */
function versionOf(
  wanted: WantedSong,
  candidate: Candidate,
): "studio" | "backing" | "live" {
  if (VERSION_PATTERN.test(wanted.title)) {
    return "studio";
  }

  if (
    BACKING_PATTERN.test(candidate.title) ||
    BACKING_PATTERN.test(candidate.albumName ?? "")
  ) {
    return "backing";
  }

  return LIVE_PATTERN.test(candidate.title) ||
    LIVE_ALBUM_PATTERN.test(candidate.albumName ?? "")
    ? "live"
    : "studio";
}

/**
 * Whether a concert recording's year can't be right, because its title names
 * a later one ("Live in Malaysia 2004", dated 1983): services leave a wrong
 * date on some, and one dated before the studio original would pass for it.
 */
function isMisdated(candidate: Candidate): boolean {
  const { releaseYear } = candidate;

  if (releaseYear === null || releaseYear === undefined) {
    return false;
  }

  const text = `${candidate.title} ${candidate.albumName ?? ""}`;

  return [...text.matchAll(NAMED_YEAR_PATTERN)].some(([whole, short]) => {
    const named =
      short === undefined
        ? Number(whole)
        : Number(short) + (Number(short) <= 30 ? 2000 : 1900);

    return named > releaseYear;
  });
}

/**
 * Whether a candidate is on an EP named for the song itself ("One - EP" for
 * "One"), which is a single by another name.
 */
function isSongNamedEp(wanted: WantedSong, candidate: Candidate): boolean {
  const album = candidate.albumName ?? "";

  // A service that says outright what a release is has told a single from an
  // EP already.
  if (candidate.kind !== undefined) {
    return false;
  }

  return (
    EP_PATTERN.test(album) &&
    simplify(album.replace(EP_PATTERN, "")).startsWith(simplify(wanted.title))
  );
}

/** 1 for a candidate on a compilation, single, or an EP that is a single in disguise, 0 for one on an album of its own. */
function notAnAlbumPenalty(wanted: WantedSong, candidate: Candidate): number {
  const album = candidate.albumName ?? "";
  const named =
    candidate.kind === undefined
      ? COMPILATION_PATTERN.test(album) || SINGLE_PATTERN.test(album)
      : candidate.kind === "compilation" || candidate.kind === "single";

  return named || isSongNamedEp(wanted, candidate) ? 1 : 0;
}

/**
 * Which kind of release a candidate is, for choosing between ones of the same
 * year: an album (0), then an EP (1), then a soundtrack (2).
 */
function releaseKind(candidate: Candidate): number {
  if (candidate.kind !== undefined) {
    return candidate.kind === "soundtrack"
      ? 2
      : candidate.kind === "ep"
        ? 1
        : 0;
  }

  const album = candidate.albumName ?? "";

  return SOUNDTRACK_PATTERN.test(album) ? 2 : EP_PATTERN.test(album) ? 1 : 0;
}

/** Keeps only the entries with the lowest penalty. */
function leastPenalized<T>(entries: T[], penalty: (entry: T) => number): T[] {
  const lowest = Math.min(...entries.map(penalty));

  return entries.filter((entry) => penalty(entry) === lowest);
}

/**
 * Picks the candidate that is the wanted song, or `null` when none of them
 * is close enough to be sure. Showing nothing beats showing the wrong song,
 * so this errs toward `null`.
 *
 * Candidates must agree on both title and artist (an artist who is only part
 * of someone else's credit counts if the title is the very same, and one
 * with only a backing band added is the same act), and tribute acts and
 * karaoke tracks are never chosen, nor are instrumental, karaoke, or
 * re-recorded takes of a song that wasn't asked for as one, nor live ones unless they came out
 * before every other release found. Among those left, the act itself comes
 * before a credit it is only part of; of those, only the closest matches
 * (within {@link CLOSE_ENOUGH} of the best) are kept; of those, a song on an
 * album of its own comes before one on a compilation or single (which is
 * still better than nothing); and of those, the earliest release wins (of
 * one year, an album, then an EP, then a soundtrack), then the service's own
 * ordering.
 */
function chooseMatch<T extends Candidate>(
  wanted: WantedSong,
  candidates: readonly T[],
): T | null {
  const acceptable = candidates
    .map((candidate, position) => ({
      candidate,
      position,
      closeness: 0,
      score: scoreCandidate(wanted, candidate),
    }))
    .filter(
      ({ candidate, score }) =>
        score.title >= MIN_TITLE_SIMILARITY &&
        score.artist >= MIN_ARTIST_SIMILARITY &&
        !isImitation(wanted, candidate),
    )
    .map((entry) => ({
      ...entry,
      closeness: entry.score.title + entry.score.artist,
    }));

  const versions = acceptable.map((entry) => ({
    ...entry,
    version: versionOf(wanted, entry.candidate),
  }));
  const studio = versions.filter(({ version }) => version === "studio");
  const studioYears = studio.flatMap(
    ({ candidate }) => candidate.releaseYear ?? [],
  );
  const live = versions.filter(
    ({ version, candidate }) => version === "live" && !isMisdated(candidate),
  );
  const liveYears = [
    ...new Set(live.flatMap(({ candidate }) => candidate.releaseYear ?? [])),
  ].toSorted((x, y) => x - y);
  // A concert recording is the song's own release when it came out before
  // every other one we know of -- or, when there is nothing but concert
  // recordings, when it came out long before the rest.
  const [earliestLive, nextLive] = liveYears;
  const debut =
    studioYears.length > 0
      ? Math.min(...studioYears)
      : studio.length === 0 &&
          earliestLive !== undefined &&
          nextLive !== undefined &&
          nextLive - earliestLive >= LIVE_DEBUT_GAP_YEARS
        ? nextLive
        : null;
  const debutLive = live.filter(
    ({ candidate }) =>
      debut !== null && (candidate.releaseYear ?? Infinity) < debut,
  );
  // The act itself, rather than a credit it is only part of, is the better
  // answer whenever there is one.
  const whole = leastPenalized([...studio, ...debutLive], ({ score }) =>
    score.partial ? 1 : 0,
  );
  const best = Math.max(...whole.map(({ closeness }) => closeness));
  const closest = whole.filter(
    ({ closeness }) => closeness >= best - CLOSE_ENOUGH,
  );
  const original = leastPenalized(closest, ({ candidate }) =>
    notAnAlbumPenalty(wanted, candidate),
  );

  return (
    original.toSorted(
      (a, b) =>
        (a.candidate.releaseYear ?? Infinity) -
          (b.candidate.releaseYear ?? Infinity) ||
        releaseKind(a.candidate) - releaseKind(b.candidate) ||
        a.position - b.position,
    )[0]?.candidate ?? null
  );
}

/**
 * Whether a candidate is on an album (or an EP) of its own, rather than on a
 * single, compilation, soundtrack, or an EP named for the song.
 */
function isProperAlbum(wanted: WantedSong, candidate: Candidate): boolean {
  return (
    notAnAlbumPenalty(wanted, candidate) === 0 && releaseKind(candidate) !== 2
  );
}

export { chooseMatch, isProperAlbum, simplify };
export type { Candidate, ReleaseKind, WantedSong };
