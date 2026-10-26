/** Words that mark a reissue of an album rather than another album. */
const EDITION_WORDS =
  /\b(deluxe|expanded|remaster(ed)?|re-?issue|anniversary|bonus|special|legacy|collector'?s|edition|version|complete|super|mono|stereo|explicit|clean)\b/i;

/** A bracketed note at the end of a name, or a dash and a note. */
const TRAILING_NOTE = /\s*(?:[([]([^)\]]*)[)\]]|\s-\s(.+))$/;

/** A note that says what the album was called before: "I Choose You (Formerly Blind over You)". */
const RETITLED = /^.+?\s*[([]\s*formerly(?: known as)?:?\s+(.+?)\s*[)\]]$/i;

/** A note that says which disc of a set a track is on: "(Disc 1)", "[CD 2]". */
const DISC_NOTE = /\s*[([]\s*(?:disc|cd)\s*\d+\s*[)\]]/gi;

/** A year alone in the note, as in "Seal [1991]": the year has a place of its own. */
const YEAR_NOTE = /^\s*\d{4}\s*$/;

/** How a service marks an EP or a single, which is part of the name we keep. */
const RELEASE_MARK = /(\s-\s(?:EP|Single))$/i;

/**
 * The album's name without the edition it was found on: the modern
 * remastered or expanded reissue is often the only one a service has, but
 * the album is the same ("Insomniac (25th Anniversary Deluxe Edition)" is
 * "Insomniac"). Notes that make it another release -- a live album, a
 * soundtrack -- stay.
 */
function cleanAlbumName(name: string): string {
  // Which disc of a set a track is on says nothing about the album, and a
  // live album is marked (Live) however a service brackets it.
  name = name
    .replace(DISC_NOTE, "")
    .replace(/\s*\[\s*live\s*\]\s*$/i, " (Live)")
    .trim();

  // An album that was retitled is known by the title it came out under.
  const retitled = RETITLED.exec(name)?.[1];

  if (retitled !== undefined) {
    return cleanAlbumName(retitled);
  }

  const mark = RELEASE_MARK.exec(name)?.[1] ?? "";
  let cleaned = mark === "" ? name : name.slice(0, -mark.length);

  for (;;) {
    const note = TRAILING_NOTE.exec(cleaned);
    const text = note?.[1] ?? note?.[2] ?? "";
    const stripped = note ? cleaned.slice(0, note.index).trimEnd() : cleaned;

    if (
      !note ||
      !(EDITION_WORDS.test(text) || YEAR_NOTE.test(text)) ||
      stripped === ""
    ) {
      break;
    }

    cleaned = stripped;
  }

  return cleaned + mark;
}

/** A word, with an apostrophe-joined tail ("Don't") kept as part of it. */
const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

/**
 * The small words that title-case writing sometimes leaves in lowercase
 * ("Mental Floss for the Globe"), which our style capitalizes. "vs" is not
 * one of them: it stays lowercase.
 */
const SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "for",
  "and",
  "but",
  "or",
  "nor",
  "in",
  "on",
  "at",
  "to",
  "by",
  "from",
  "with",
  "as",
  "is",
  "it",
  "over",
  "into",
  "onto",
  "upon",
  "off",
  "out",
  "up",
  "down",
]);

/**
 * The album's name as we save it: without its edition, and with the small
 * words left in lowercase in a title-cased name capitalized, as in the names
 * of songs and artists ("Mental Floss for the Globe" is "Mental Floss For The
 * Globe"). Nothing else is touched: not other lowercase words, not capitals
 * in the middle of a word, and not a name written entirely in lowercase, since
 * those are often deliberate ("xx", "nWo", "thank u, next").
 */
function tidyAlbumName(name: string): string {
  const cleaned = cleanAlbumName(name);

  if (cleaned === cleaned.toLowerCase()) {
    return cleaned;
  }

  return cleaned.replaceAll(WORD, (word) =>
    SMALL_WORDS.has(word) ? word.charAt(0).toUpperCase() + word.slice(1) : word,
  );
}

export { cleanAlbumName, tidyAlbumName };
