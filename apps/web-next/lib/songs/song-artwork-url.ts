import { SONG_METADATA_STATUS } from "@song-lists/db";
import type { Song } from "@/lib/queries/songs";

/** The address of a song's cover art, or `null` when the lookup found none. */
function songArtworkUrl({ metadata }: Pick<Song, "metadata">): string | null {
  return metadata?.status === SONG_METADATA_STATUS.MATCHED
    ? metadata.artworkUrl
    : null;
}

export { songArtworkUrl };
