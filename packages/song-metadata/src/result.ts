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
      /** How far the release is from a plain album: 0 for one, 1 for an EP, 2 for a soundtrack. */
      releaseRank?: number;
    }
  | { status: typeof SONG_METADATA_STATUS.NOT_FOUND }
  | { status: typeof SONG_METADATA_STATUS.ERROR; message: string };

export type { SongLookupResult };
