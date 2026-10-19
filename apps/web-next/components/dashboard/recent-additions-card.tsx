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
import { formatDate } from "@/lib/text/format-date";

/** The newest songs in the catalog, from anyone. */
function RecentAdditionsCard({ additions }: { additions: CatalogAddition[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" />
          Latest in the catalog
        </CardTitle>
        <CardDescription>Newly added songs from everyone</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
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
