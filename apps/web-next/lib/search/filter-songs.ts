import { readSymbols } from "@/lib/text/read-symbols";
import type { Song } from "../queries/songs";

/** Lowercased, with "$" and "!" used as letters read as the "s" and "i" they stand for. */
function searchable(text: string): string {
  return readSymbols(text).toLowerCase();
}

function matchesQuery(song: Song, needle: string): boolean {
  return (
    searchable(song.title).includes(needle) ||
    searchable(song.artist.name).includes(needle)
  );
}

export function filterSongs(songs: Song[], query: string): Song[] {
  const needle = searchable(query.trim());

  return needle ? songs.filter((song) => matchesQuery(song, needle)) : songs;
}
