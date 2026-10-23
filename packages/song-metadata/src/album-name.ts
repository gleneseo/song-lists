import { checkStyle } from "./title-style.js";

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

/**
 * The album's name as we save it: without its edition, and written in our
 * house style for names ("Mental Floss For The Globe", not "Mental Floss for
 * the Globe"), as the names of songs and artists are.
 */
function tidyAlbumName(name: string): string {
  const cleaned = cleanAlbumName(name);
  const style = checkStyle(cleaned);

  return style.ok ? cleaned : style.suggestion;
}

export { cleanAlbumName, tidyAlbumName };
