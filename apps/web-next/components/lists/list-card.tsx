import Link from "next/link";
import { ListMusic } from "lucide-react";
import type { ListOverview } from "@/lib/queries/lists";
import { countLabel } from "@/lib/text/count-label";
import { formatPercent } from "@/lib/text/format-percent";
import { formatTimeAgo } from "@/lib/text/format-date";

/** One list as a link card: its size, the viewer's share of it, and when it last grew. */
function ListCard({ list, now }: { list: ListOverview; now: Date }) {
  const share = list.songCount === 0 ? 0 : list.yourSongCount / list.songCount;

  return (
    <Link
      href={`/lists/${list.id}`}
      className="group/list flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 transition-shadow outline-none hover:ring-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start gap-2">
        <ListMusic className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="font-medium leading-snug">{list.name}</p>
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        <p className="text-muted-foreground">
          {countLabel(list.songCount, "song")}
          {list.lastAddedAt &&
            ` · updated ${formatTimeAgo(list.lastAddedAt, now)}`}
        </p>
        <div
          role="img"
          aria-label={`You added ${formatPercent(list.yourSongCount, list.songCount)} of this list`}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${share * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          You added {list.yourSongCount.toLocaleString("en-US")} (
          {formatPercent(list.yourSongCount, list.songCount)})
        </p>
      </div>
    </Link>
  );
}

export { ListCard };
