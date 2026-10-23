/** Words that mark a reissue of an album rather than another album. */
const EDITION_WORDS =
  /\b(deluxe|expanded|remaster(ed)?|re-?issue|anniversary|bonus|special|legacy|collector'?s|edition|version|complete|super|mono|stereo|explicit|clean)\b/i;

/** A bracketed note at the end of a name, or a dash and a note. */
const TRAILING_NOTE = /\s*(?:[([]([^)\]]*)[)\]]|\s-\s(.+))$/;

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
  const mark = RELEASE_MARK.exec(name)?.[1] ?? "";
  let cleaned = mark === "" ? name : name.slice(0, -mark.length);

  for (;;) {
    const note = TRAILING_NOTE.exec(cleaned);
    const text = note?.[1] ?? note?.[2] ?? "";
    const stripped = note ? cleaned.slice(0, note.index).trimEnd() : cleaned;

    if (!note || !EDITION_WORDS.test(text) || stripped === "") {
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
