import { SONG_METADATA_SOURCE } from "@song-lists/db/song-metadata";

/**
 * Who to thank for a song's album details, given where they came from; nobody
 * when no service was behind them, as when they were set by hand.
 */
function metadataCredit(source: string | null): string | null {
  if (source === null) {
    return null;
  }

  return source === SONG_METADATA_SOURCE.MUSICBRAINZ
    ? "MusicBrainz and the Cover Art Archive"
    : "iTunes";
}

export { metadataCredit };
