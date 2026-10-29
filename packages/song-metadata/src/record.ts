import {
  type Database,
  SONG_METADATA_MATCHED_BY,
  SONG_METADATA_STATUS,
  SYSTEM_USER_ID,
  schema,
} from "@song-lists/db";
import { eq, sql } from "drizzle-orm";
import type { SongLookupResult } from "./result.js";
import type { WantedSong } from "./match.js";

/** Looks a song up by title and artist; see {@link createItunesLookup}. */
type SongLookup = (wanted: WantedSong) => Promise<SongLookupResult>;

interface RecordDependencies {
  db: Database;
  lookup: SongLookup;
}

/** What happened when a song was looked up and its result saved. */
type RecordOutcome =
  | {
      status: typeof SONG_METADATA_STATUS.MATCHED;
      title: string;
      artistName: string;
      albumName: string | null;
      releaseYear: number | null;
    }
  | {
      status: typeof SONG_METADATA_STATUS.NOT_FOUND;
      title: string;
      artistName: string;
    }
  | {
      status: typeof SONG_METADATA_STATUS.ERROR;
      message: string;
      title?: string;
      artistName?: string;
    }
  /** No song has that ID (it may have been deleted meanwhile). */
  | { status: "missing" };

const NO_DETAILS = {
  source: null,
  sourceTrackId: null,
  artworkUrl: null,
  albumName: null,
  releaseYear: null,
} as const;

/** The cover art to save: the row's own if a person chose it, else the lookup's. */
const keepChosenArtwork = sql`case when "song_metadata"."artwork_matched_by" = ${SONG_METADATA_MATCHED_BY.MANUAL} then "song_metadata"."artwork_url" else excluded."artwork_url" end`;

/**
 * Looks a song up and saves what turned up (or that nothing did) beside it,
 * so its art and album can be shown without asking again.
 *
 * It never throws: a lookup that fails, or a result that can't be saved, comes
 * back as an `error` outcome. A row that a person chose by hand is never
 * replaced by a later automatic lookup, and a lookup that errored never
 * replaces details already found.
 */
async function recordSongMetadata(
  { db, lookup }: RecordDependencies,
  songId: number,
): Promise<RecordOutcome> {
  try {
    const song = await db.query.songs.findFirst({
      where: eq(schema.songs.id, songId),
      columns: { title: true },
      with: { artist: { columns: { name: true } } },
    });

    if (!song) {
      return { status: "missing" };
    }

    const wanted = { title: song.title, artistName: song.artist.name };
    const result = await lookup(wanted);
    const details =
      result.status === SONG_METADATA_STATUS.MATCHED
        ? {
            source: result.source,
            sourceTrackId: result.sourceTrackId,
            artworkUrl: result.artworkUrl,
            albumName: result.albumName,
            releaseYear: result.releaseYear,
          }
        : NO_DETAILS;
    const now = new Date();
    const insert = db.insert(schema.songMetadata).values({
      songId,
      status: result.status,
      ...details,
      detailsMatchedBy: SONG_METADATA_MATCHED_BY.AUTO,
      artworkMatchedBy: SONG_METADATA_MATCHED_BY.AUTO,
      fetchedAt: now,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    if (result.status === SONG_METADATA_STATUS.ERROR) {
      await insert.onConflictDoNothing({ target: schema.songMetadata.songId });

      return { status: result.status, message: result.message, ...wanted };
    }

    await insert.onConflictDoUpdate({
      target: schema.songMetadata.songId,
      set: {
        status: result.status,
        ...details,
        // Cover art chosen by hand stays while the rest of the details are
        // refreshed, unless nothing matched, which leaves no art to keep.
        ...(result.status === SONG_METADATA_STATUS.MATCHED
          ? { artworkUrl: keepChosenArtwork }
          : { artworkMatchedBy: SONG_METADATA_MATCHED_BY.AUTO }),
        fetchedAt: now,
        updatedAt: now,
        updatedBy: SYSTEM_USER_ID,
      },
      setWhere: eq(
        schema.songMetadata.detailsMatchedBy,
        SONG_METADATA_MATCHED_BY.AUTO,
      ),
    });

    return result.status === SONG_METADATA_STATUS.MATCHED
      ? {
          status: result.status,
          ...wanted,
          albumName: result.albumName,
          releaseYear: result.releaseYear,
        }
      : { status: result.status, ...wanted };
  } catch (error) {
    return {
      status: SONG_METADATA_STATUS.ERROR,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export { recordSongMetadata };
export type { RecordDependencies, RecordOutcome, SongLookup };
