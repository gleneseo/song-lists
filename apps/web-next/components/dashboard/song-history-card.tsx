import { History } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListPill } from "@/components/lists/list-pill";
import { SongSummary } from "@/components/song-summary";
import type { HistoryEntry } from "@/lib/queries/dashboard";
import { countLabel } from "@/lib/text/count-label";
import { formatDate, formatTimeAgo } from "@/lib/text/format-date";

/** A scrollable, newest-first history of the songs the viewer added. */
function SongHistoryCard({
  entries,
  total,
  now,
}: {
  entries: HistoryEntry[];
  total: number;
  now: Date;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          Your song history
        </CardTitle>
        <CardDescription>
          {entries.length < total
            ? `Your ${entries.length} most recent of ${countLabel(total, "song")}`
            : countLabel(total, "song")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            You haven&apos;t added any songs yet. Add your first one to start
            your history.
          </p>
        ) : (
          <ul
            tabIndex={0}
            aria-label="Songs you added, newest first"
            className="-mx-1 max-h-[32rem] divide-y divide-border overflow-y-auto px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {entries.map((entry) => (
              <li
                key={`${entry.song.id}-${entry.addedAt.toISOString()}`}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <SongSummary song={entry.song} />
                  {entry.lists.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.lists.map((list) => (
                        <ListPill key={list.id} {...list} />
                      ))}
                    </div>
                  )}
                </div>
                <p
                  className="shrink-0 text-xs text-muted-foreground sm:text-right"
                  title={formatDate(entry.addedAt)}
                >
                  {formatDate(entry.addedAt)}
                  <span className="block">
                    {formatTimeAgo(entry.addedAt, now)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export { SongHistoryCard };
