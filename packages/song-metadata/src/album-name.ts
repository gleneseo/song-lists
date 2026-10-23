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

/** Written in lowercase whatever its place in a name, as in "Kramer vs. Kramer". */
const ALWAYS_LOWERCASE = new Set(["vs"]);

/**
 * The album's name as we save it: without its edition, and with each word
 * that is entirely lowercase given a capital, as in the names of songs and
 * artists ("Mental Floss for the Globe" is "Mental Floss For The Globe").
 * Nothing else is touched -- not an acronym, nor capitals in the middle of a
 * word -- since those are often deliberate and a service's spelling is as good
 * a guess as any.
 */
function tidyAlbumName(name: string): string {
  return cleanAlbumName(name).replaceAll(WORD, (word) => {
    const first = word.charAt(0);

    return word === word.toLowerCase() &&
      first !== first.toUpperCase() &&
      !ALWAYS_LOWERCASE.has(word)
      ? first.toUpperCase() + word.slice(1)
      : word;
  });
}

export { cleanAlbumName, tidyAlbumName };
