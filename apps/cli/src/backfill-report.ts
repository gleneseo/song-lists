import type {
  BackfillProgress,
  BackfillSummary,
  SongMetadataReportRow,
} from "@song-lists/song-metadata";

/** "45s", "12m", "4h 40m": roughly how long, for someone deciding when to run it. */
function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.round(milliseconds / 60_000);

  if (milliseconds < 60_000) {
    return `${String(Math.round(milliseconds / 1000))}s`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours === 0
    ? `${String(minutes)}m`
    : `${String(hours)}h ${String(minutes)}m`;
}

/** What a run is about to do, for `--dry-run` and the top of a real run. */
function formatPlan(songs: number, intervalMs: number): string {
  if (songs === 0) {
    return "Every song has been looked up; there is nothing to do.";
  }

  return `${String(songs)} ${songs === 1 ? "song" : "songs"} to look up, which takes about ${formatDuration(songs * intervalMs)}.`;
}

/** One line per song looked up: where we are, which song, and how it went. */
function formatProgress({
  position,
  total,
  outcome,
}: BackfillProgress): string {
  const counter = `[${String(position)}/${String(total)}]`;

  switch (outcome.status) {
    case "matched": {
      const details = [outcome.albumName, outcome.releaseYear]
        .filter((part) => part !== null)
        .join(", ");

      return `${counter} ${outcome.artistName} — ${outcome.title}: matched${details ? ` (${details})` : ""}`;
    }
    case "not_found":
      return `${counter} ${outcome.artistName} — ${outcome.title}: not found`;
    case "error":
      return `${counter} ${outcome.artistName ?? "?"} — ${outcome.title ?? "?"}: FAILED (${outcome.message})`;
    case "missing":
      return `${counter} (the song was deleted meanwhile)`;
  }
}

/** The end-of-run report, ending with every song nothing was found for. */
function formatSummary(summary: BackfillSummary): string[] {
  const lines = [
    "",
    summary.ended === "finished"
      ? "Done."
      : summary.ended === "interrupted"
        ? "Stopped early; run it again to carry on from here."
        : "Stopped early after too many failures in a row (are iTunes or MusicBrainz turning us away?). Try again later.",
    `Looked up ${String(summary.processed)} of ${String(summary.total)}: ${String(summary.matched)} matched, ${String(summary.notFound.length)} not found, ${String(summary.errors)} failed.`,
  ];

  if (summary.errors > 0) {
    lines.push("Failed songs are tried again the next time it runs.");
  }

  if (summary.notFound.length > 0) {
    lines.push("", "Nothing was found for:");

    for (const { songId, artistName, title } of summary.notFound) {
      lines.push(`  #${String(songId)} ${artistName} — ${title}`);
    }
  }

  return lines;
}

const REPORT_COLUMNS = [
  "song_id",
  "artist",
  "title",
  "status",
  "album",
  "year",
  "source_track_id",
  "artwork_url",
  "fetched_at",
] as const;

function csvField(value: string | number | Date | null): string {
  const text =
    value === null
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * The results as CSV, one line per song, for querying with a spreadsheet,
 * sqlite, DuckDB and the like. A song never looked up has a blank status.
 */
function formatReportCsv(rows: SongMetadataReportRow[]): string {
  const lines = rows.map((row) =>
    [
      row.songId,
      row.artistName,
      row.title,
      row.status,
      row.albumName,
      row.releaseYear,
      row.sourceTrackId,
      row.artworkUrl,
      row.fetchedAt,
    ]
      .map(csvField)
      .join(","),
  );

  return [REPORT_COLUMNS.join(","), ...lines].join("\n") + "\n";
}

export {
  formatDuration,
  formatPlan,
  formatProgress,
  formatReportCsv,
  formatSummary,
};
