import { ClampedText } from "@/components/clamped-text";
import { SongTitleLink } from "@/components/songs/song-title-link";
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
      <SongTitleLink id={song.id} title={song.title} />
      <ClampedText
        lines={1}
        text={
          featured ? `${song.artist.name} feat. ${featured}` : song.artist.name
        }
        className="text-sm text-muted-foreground"
      />
      {cover && (
        <ClampedText
          lines={1}
          text={`Cover of ${cover}`}
          className="text-xs text-muted-foreground"
        />
      )}
    </div>
  );
}

export { SongSummary };
