import type {
  SONG_METADATA_SOURCE,
  SONG_METADATA_STATUS,
} from "@song-lists/db";

/** What a lookup found out about a song. */
type SongLookupResult =
  | {
      status: typeof SONG_METADATA_STATUS.MATCHED;
      source:
        | typeof SONG_METADATA_SOURCE.ITUNES
        | typeof SONG_METADATA_SOURCE.MUSICBRAINZ;
      sourceTrackId: string;
      /** The title and artist the service has for the song it matched, which can differ a little from the ones asked for. */
      matchedTitle?: string;
      matchedArtistName?: string;
      artworkUrl: string | null;
      albumName: string | null;
      releaseYear: number | null;
      /** Whether the song is on an album of its own, not a single, compilation, or soundtrack. */
      isAlbum: boolean;
    }
  | { status: typeof SONG_METADATA_STATUS.NOT_FOUND }
  | { status: typeof SONG_METADATA_STATUS.ERROR; message: string };

export type { SongLookupResult };
