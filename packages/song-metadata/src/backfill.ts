import { type Database, SONG_METADATA_STATUS, schema } from "@song-lists/db";
import { asc, eq, inArray, isNull, or } from "drizzle-orm";
import {
  recordSongMetadata,
  type RecordOutcome,
  type SongLookup,
} from "./record.js";

/** After this many failures in a row, stop rather than keep hitting a service that is turning us away. */
const DEFAULT_MAX_CONSECUTIVE_ERRORS = 5;

interface WhichSongs {
  /** Look songs up again whose last lookup failed. */
  retryErrors: boolean;
  /** Look songs up again that were looked up and not found. */
  retryNotFound: boolean;
  /** Look up no more than this many songs. */
  limit?: number | undefined;
}

/**
 * The songs to look up, in the order they were added: those never looked up,
 * plus (as asked) those whose lookup failed or found nothing. A song whose
 * match a person chose by hand is a `matched` row and so never comes up.
 */
async function findSongsToBackfill(
  db: Database,
  { retryErrors, retryNotFound, limit }: WhichSongs,
): Promise<number[]> {
  const statuses = [
    ...(retryErrors ? [SONG_METADATA_STATUS.ERROR] : []),
    ...(retryNotFound ? [SONG_METADATA_STATUS.NOT_FOUND] : []),
  ];
  const query = db
    .select({ id: schema.songs.id })
    .from(schema.songs)
    .leftJoin(
      schema.songMetadata,
      eq(schema.songMetadata.songId, schema.songs.id),
    )
    .where(
      statuses.length > 0
        ? or(
            isNull(schema.songMetadata.id),
            inArray(schema.songMetadata.status, statuses),
          )
        : isNull(schema.songMetadata.id),
    )
    .orderBy(asc(schema.songs.id));

  return (await (limit === undefined ? query : query.limit(limit))).map(
    (row) => row.id,
  );
}

interface BackfillProgress {
  /** Which song this is, counting from 1, and how many there are in all. */
  position: number;
  total: number;
  songId: number;
  outcome: RecordOutcome;
}

interface BackfillOptions extends WhichSongs {
  db: Database;
  lookup: SongLookup;
  maxConsecutiveErrors?: number;
  /** Checked before each song; when it says yes, the run stops there. */
  shouldStop?: () => boolean;
  onProgress?: (progress: BackfillProgress) => void | Promise<void>;
}

interface BackfillSummary {
  /** How many songs were due a lookup when the run began. */
  total: number;
  /** How many were looked up before it ended. */
  processed: number;
  matched: number;
  errors: number;
  /** The songs nothing was found for, to look over afterwards. */
  notFound: { songId: number; title: string; artistName: string }[];
  ended: "finished" | "interrupted" | "too-many-errors";
}

/**
 * Looks up every song that is due one, a song at a time (the lookup itself
 * spaces its requests out), saving each result as it arrives -- so a run can
 * be stopped at any point and picked up again later: the next run finds only
 * what's left.
 */
async function backfillSongMetadata({
  db,
  lookup,
  maxConsecutiveErrors = DEFAULT_MAX_CONSECUTIVE_ERRORS,
  shouldStop = () => false,
  onProgress = () => undefined,
  ...which
}: BackfillOptions): Promise<BackfillSummary> {
  const songIds = await findSongsToBackfill(db, which);
  const summary: BackfillSummary = {
    total: songIds.length,
    processed: 0,
    matched: 0,
    errors: 0,
    notFound: [],
    ended: "finished",
  };
  let errorsInARow = 0;

  for (const [index, songId] of songIds.entries()) {
    if (shouldStop()) {
      summary.ended = "interrupted";
      break;
    }

    const outcome = await recordSongMetadata({ db, lookup }, songId);

    summary.processed += 1;
    errorsInARow =
      outcome.status === SONG_METADATA_STATUS.ERROR ? errorsInARow + 1 : 0;

    if (outcome.status === SONG_METADATA_STATUS.MATCHED) {
      summary.matched += 1;
    } else if (outcome.status === SONG_METADATA_STATUS.NOT_FOUND) {
      summary.notFound.push({
        songId,
        title: outcome.title,
        artistName: outcome.artistName,
      });
    } else if (outcome.status === SONG_METADATA_STATUS.ERROR) {
      summary.errors += 1;
    }

    await onProgress({
      position: index + 1,
      total: songIds.length,
      songId,
      outcome,
    });

    if (errorsInARow >= maxConsecutiveErrors) {
      summary.ended = "too-many-errors";
      break;
    }
  }

  return summary;
}

export { backfillSongMetadata, findSongsToBackfill };
export type { BackfillOptions, BackfillProgress, BackfillSummary, WhichSongs };
