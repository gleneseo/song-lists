import { writeFile } from "node:fs/promises";
import { createDb } from "@song-lists/db";
import { loadNearestEnv } from "@song-lists/db/load-env";
import {
  type BackfillSummary,
  backfillSongMetadata,
  createItunesLookup,
  findSongsToBackfill,
  ITUNES_MIN_INTERVAL_MS,
  listSongMetadataReport,
} from "@song-lists/song-metadata";
import {
  formatPlan,
  formatProgress,
  formatReportCsv,
  formatSummary,
} from "./backfill-report.js";

interface BackfillCommandOptions {
  limit: number | undefined;
  retryNotFound: boolean;
  dryRun: boolean;
  /** Where to write every song's lookup result as CSV when the run ends. */
  report: string | undefined;
}

/**
 * Looks up the songs that have no art and album yet. Stops cleanly on Ctrl-C
 * (after the song in hand), since every result is saved as it arrives and a
 * later run carries on from there.
 */
async function runBackfillMetadata({
  limit,
  retryNotFound,
  dryRun,
  report,
}: BackfillCommandOptions): Promise<void> {
  loadNearestEnv(process.cwd());

  const { DATABASE_URL } = process.env;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const { db, pool } = createDb({ connectionString: DATABASE_URL });

  const writeReport = async () => {
    if (report !== undefined) {
      await writeFile(
        report,
        formatReportCsv(await listSongMetadataReport(db)),
      );
      console.log(`Wrote the results to ${report}.`);
    }
  };

  try {
    const which = { retryErrors: true, retryNotFound, limit };

    if (dryRun) {
      const songs = await findSongsToBackfill(db, which);

      console.log(formatPlan(songs.length, ITUNES_MIN_INTERVAL_MS));
      await writeReport();

      return;
    }

    let interrupted = false;
    let signals = 0;

    // The first Ctrl-C finishes the song in hand and reports; a second one
    // stops at once. (Having any listener switches off Node's own default of
    // exiting, so the second has to be handled here too.)
    const onSigint = () => {
      signals += 1;

      if (signals > 1) {
        process.exit(130);
      }

      interrupted = true;
      console.log("\nStopping after this song (Ctrl-C again to stop now)...");
    };

    process.on("SIGINT", onSigint);

    let summary: BackfillSummary;

    try {
      summary = await backfillSongMetadata({
        db,
        lookup: createItunesLookup(),
        ...which,
        shouldStop: () => interrupted,
        onProgress: (progress) => {
          if (progress.position === 1) {
            console.log(formatPlan(progress.total, ITUNES_MIN_INTERVAL_MS));
          }

          console.log(formatProgress(progress));
        },
      });
    } finally {
      process.off("SIGINT", onSigint);
    }

    console.log(formatSummary(summary).join("\n"));
    await writeReport();
  } finally {
    await pool.end();
  }
}

export { runBackfillMetadata };
export type { BackfillCommandOptions };
