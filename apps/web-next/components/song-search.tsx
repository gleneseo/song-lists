"use client";

import { useMemo, useState } from "react";
import { Disc3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { filterSongs } from "@/lib/search/filter-songs";
import { coverOfLabel, featuredArtistsLabel } from "@/lib/text/song-labels";
import type { Song } from "@/lib/queries/songs";

export function SongSearch({ songs }: { songs: Song[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterSongs(songs, query), [query, songs]);

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
            <span className="flex items-center gap-1.5">
              <span className="font-medium">{song.title}</span>
              {song.coverOf.length > 0 && (
                <span
                  role="img"
                  aria-label={`Cover of ${coverOfLabel(song)}`}
                  title={`Cover of ${coverOfLabel(song)}`}
                  className="flex size-4 shrink-0 items-center justify-center rounded-full bg-blue-500"
                >
                  <Disc3 className="size-2.5 text-white" aria-hidden="true" />
                </span>
              )}
            </span>
            <div className="flex flex-col items-end">
              <span className="text-sm text-muted-foreground">
                {song.artist.name}
              </span>
              {song.featuredArtists.length > 0 && (
                <span className="text-xs text-muted-foreground/70">
                  feat. {featuredArtistsLabel(song.featuredArtists)}
                </span>
              )}
            </div>
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
