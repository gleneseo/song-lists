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
      artworkUrl: string | null;
      albumName: string | null;
      releaseYear: number | null;
      /** Whether the song is on an album of its own, not a single, compilation, or soundtrack. */
      isAlbum: boolean;
      /**
       * The year the recording first came out anywhere, when the service says:
       * no release of the song can be earlier.
       */
      songYear?: number | null;
    }
  | { status: typeof SONG_METADATA_STATUS.NOT_FOUND }
  | { status: typeof SONG_METADATA_STATUS.ERROR; message: string };

export type { SongLookupResult };
