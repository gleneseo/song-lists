"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Song } from "@/lib/songs";

function matches(song: Song, needle: string): boolean {
  return (
    song.title.toLowerCase().includes(needle) ||
    song.artist.name.toLowerCase().includes(needle)
  );
}

function SongSearch({ songs }: { songs: Song[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? songs.filter((song) => matches(song, needle)) : songs;
  }, [query, songs]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        placeholder="Search by title or artist…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        aria-label="Search songs"
      />
      <p className="text-sm text-muted-foreground">
        {filtered.length} of {songs.length} songs
      </p>
      <ul className="divide-y divide-border">
        {filtered.map((song) => (
          <li
            key={song.id}
            className="flex items-baseline justify-between gap-4 py-2"
          >
            <span className="font-medium">{song.title}</span>
            <span className="text-sm text-muted-foreground">
              {song.artist.name}
            </span>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="text-muted-foreground">
          No songs match &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}

export { SongSearch };
