import type { Song } from "@/lib/queries/songs";
import { coverOfLabel, featuredArtistsLabel } from "@/lib/text/song-labels";

/**
 * A song's title, its artist (with any featured artists), and -- for a
 * cover -- the original it covers. Shared by every place a song is listed.
 */
function SongSummary({ song }: { song: Song }) {
  const featured = featuredArtistsLabel(song.featuredArtists);
  const cover = coverOfLabel(song);

  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{song.title}</p>
      <p className="truncate text-sm text-muted-foreground">
        {song.artist.name}
        {featured && ` feat. ${featured}`}
      </p>
      {cover && (
        <p className="truncate text-xs text-muted-foreground">
          Cover of {cover}
        </p>
      )}
    </div>
  );
}

export { SongSummary };
