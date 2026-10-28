import { Music } from "lucide-react";
import { artworkUrlAtSize } from "@song-lists/song-metadata/artwork";
import { SongArtwork } from "@/components/songs/song-artwork";
import type { Song } from "@/lib/queries/songs";
import { songArtworkUrl } from "@/lib/songs/song-artwork-url";

/** A square the size of the art, standing in where a song has none. */
function NoArtwork({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-foreground/10"
      style={{ width: size, height: size }}
    >
      <Music className="size-1/2" />
    </span>
  );
}

/**
 * A song's cover art as a small square beside its title in a list, or a
 * plain tile when it has none, so the rows line up either way. It adds
 * nothing for a screen reader: the title next to it says what it is.
 */
function SongThumbnail({
  song,
  size = 40,
}: {
  song: Pick<Song, "metadata">;
  size?: number;
}) {
  const artworkUrl = songArtworkUrl(song);

  return artworkUrl ? (
    <SongArtwork
      src={artworkUrlAtSize(artworkUrl, size * 2)}
      alt=""
      size={size}
      fallback={<NoArtwork size={size} />}
    />
  ) : (
    <NoArtwork size={size} />
  );
}

export { SongThumbnail };
