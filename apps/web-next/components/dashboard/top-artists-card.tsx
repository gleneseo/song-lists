import { Mic2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TopArtist } from "@/lib/queries/dashboard";
import { countLabel } from "@/lib/text/count-label";

/** The artists the viewer has added the most songs by, as proportional bars. */
function TopArtistsCard({ artists }: { artists: TopArtist[] }) {
  const most = artists[0]?.songCount ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic2 className="size-4" />
          Your top artists
        </CardTitle>
        <CardDescription>Most songs added</CardDescription>
      </CardHeader>
      <CardContent>
        {artists.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No artists yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {artists.map((artist) => (
              <li key={artist.id} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{artist.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {countLabel(artist.songCount, "song")}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(artist.songCount / most) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export { TopArtistsCard };
