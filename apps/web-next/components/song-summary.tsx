import { ClampedText } from "@/components/clamped-text";
import { ArtistLink } from "@/components/entity-links";
import { SongThumbnail } from "@/components/songs/song-thumbnail";
import { SongTitleLink } from "@/components/songs/song-title-link";
import type { Song } from "@/lib/queries/songs";
import { coverOfLabel, featuredArtistsLabel } from "@/lib/text/song-labels";

/**
 * A song's cover art, its title, its artist (with any featured artists), and -- for a
 * cover -- the original it covers. Shared by every place a song is listed.
 */
function SongSummary({ song }: { song: Song }) {
  const featured = featuredArtistsLabel(song.featuredArtists);
  const cover = coverOfLabel(song);
  const artistLine = featured
    ? `${song.artist.name} feat. ${featured}`
    : song.artist.name;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <SongThumbnail song={song} />
      <div className="min-w-0">
        <SongTitleLink id={song.id} title={song.title} />
        <p
          title={artistLine}
          className="line-clamp-1 text-sm wrap-anywhere text-muted-foreground"
        >
          <ArtistLink id={song.artist.id}>{song.artist.name}</ArtistLink>
          {featured && ` feat. ${featured}`}
        </p>
        {cover && (
          <ClampedText
            lines={1}
            text={`Cover of ${cover}`}
            className="text-xs text-muted-foreground"
          />
        )}
      </div>
    </div>
  );
}

export { SongSummary };
