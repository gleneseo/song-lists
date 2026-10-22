import { SONG_METADATA_SOURCE } from "@song-lists/db/song-metadata";

/** Who to thank for a song's album details, given where they came from. */
function metadataCredit(source: string | null): string {
  return source === SONG_METADATA_SOURCE.MUSICBRAINZ
    ? "MusicBrainz and the Cover Art Archive"
    : "iTunes";
}

export { metadataCredit };
