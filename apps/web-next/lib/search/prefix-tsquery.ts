import { readSymbols } from "@/lib/text/read-symbols";

/** The name of the text search configuration the `song_search` documents are built with. */
const SONG_SEARCH_CONFIG = "song_lists.song_search";

/**
 * A `to_tsquery` string for what someone has typed so far: every word must
 * be in the song, and the last may be unfinished -- "grease trav" is
 * "grease:* & trav:*". Words are read with "$" and "!" used as letters, like
 * the documents are, and stripped to letters and digits, which also keeps
 * anything typed from being read as a query operator. `null` when nothing
 * searchable is left ("", "%", "&&").
 */
function prefixTsQuery(query: string): string | null {
  const words = readSymbols(query)
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word !== "");

  return words.length > 0 ? words.map((word) => `${word}:*`).join(" & ") : null;
}

export { SONG_SEARCH_CONFIG, prefixTsQuery };
