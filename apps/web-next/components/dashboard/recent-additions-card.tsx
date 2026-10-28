import { Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SongSummary } from "@/components/song-summary";
import type { CatalogAddition } from "@/lib/queries/dashboard";
import { countLabel } from "@/lib/text/count-label";
import { formatDate } from "@/lib/text/format-date";

/**
 * The newest songs on The Master List, from anyone. Its list is a set height,
 * room for five songs, and scrolls, the same as the contributors card
 * beside it, so the two always match.
 */
function RecentAdditionsCard({ additions }: { additions: CatalogAddition[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" />
          Latest in the catalog
        </CardTitle>
        <CardDescription>
          The {countLabel(additions.length, "newest song")} on The Master List
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul
          tabIndex={0}
          aria-label="Newest songs on The Master List, newest first"
          className="-mx-1 h-75 divide-y divide-border overflow-y-auto px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {additions.map((addition) => (
            <li
              key={addition.song.id}
              className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
            >
              <SongSummary song={addition.song} />
              <p className="shrink-0 text-xs text-muted-foreground">
                {formatDate(addition.addedAt)}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export { RecentAdditionsCard };
