import { Schema } from "effect";

/**
 * How a song's metadata lookup turned out.
 *
 * The database stores the status as free text; this is the single source of
 * truth every app validates and narrows against.
 */
const SONG_METADATA_STATUS = {
  /** A close enough match was found and its details were saved. */
  MATCHED: "matched",
  /** The lookup ran but nothing matched well enough to show. */
  NOT_FOUND: "not_found",
  /** The lookup itself failed, so it is worth trying again later. */
  ERROR: "error",
} as const;

const SongMetadataStatus = Schema.Literals([
  SONG_METADATA_STATUS.MATCHED,
  SONG_METADATA_STATUS.NOT_FOUND,
  SONG_METADATA_STATUS.ERROR,
]);

type SongMetadataStatus = Schema.Schema.Type<typeof SongMetadataStatus>;

/** The outside services song metadata can come from. */
const SONG_METADATA_SOURCE = {
  ITUNES: "itunes",
  MUSICBRAINZ: "musicbrainz",
} as const;

const SongMetadataSource = Schema.Literals([
  SONG_METADATA_SOURCE.ITUNES,
  SONG_METADATA_SOURCE.MUSICBRAINZ,
]);

type SongMetadataSource = Schema.Schema.Type<typeof SongMetadataSource>;

/**
 * Whether a match was picked by the lookup itself or chosen by a person. A
 * song records it twice: for its album details (source, track, album, and
 * year) and for its cover art, so a cover can be chosen by hand while the
 * details stay automatic, and the other way around.
 */
const SONG_METADATA_MATCHED_BY = {
  AUTO: "auto",
  MANUAL: "manual",
} as const;

const SongMetadataMatchedBy = Schema.Literals([
  SONG_METADATA_MATCHED_BY.AUTO,
  SONG_METADATA_MATCHED_BY.MANUAL,
]);

type SongMetadataMatchedBy = Schema.Schema.Type<typeof SongMetadataMatchedBy>;

export {
  SONG_METADATA_MATCHED_BY,
  SONG_METADATA_SOURCE,
  SONG_METADATA_STATUS,
  SongMetadataMatchedBy,
  SongMetadataSource,
  SongMetadataStatus,
};
