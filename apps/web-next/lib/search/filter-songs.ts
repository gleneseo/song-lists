import type { Song } from "../queries/songs";

function matchesQuery(song: Song, needle: string): boolean {
  return (
    song.title.toLowerCase().includes(needle) ||
    song.artist.name.toLowerCase().includes(needle)
  );
}

export function filterSongs(songs: Song[], query: string): Song[] {
  const needle = query.trim().toLowerCase();

  return needle ? songs.filter((song) => matchesQuery(song, needle)) : songs;
}
