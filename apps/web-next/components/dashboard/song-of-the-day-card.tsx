import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListPill } from "@/components/lists/list-pill";
import { SongSummary } from "@/components/song-summary";
import type { FeaturedSong } from "@/lib/queries/dashboard";
import { formatList } from "@/lib/text/format-list";

/** Today's featured catalog song -- a daily nudge to rediscover something. */
function SongOfTheDayCard({ featured }: { featured: FeaturedSong | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          Song of the day
        </CardTitle>
        <CardDescription>
          A fresh pick from the catalog every day
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {featured ? (
          <>
            <SongSummary song={featured.song} />
            {featured.advocates.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Championed by {formatList(featured.advocates)}
              </p>
            )}
            {featured.lists.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {featured.lists.map((list) => (
                  <ListPill key={list.id} {...list} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            The catalog is empty -- add a song to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { SongOfTheDayCard };
