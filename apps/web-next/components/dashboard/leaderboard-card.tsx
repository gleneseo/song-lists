import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Leaderboard } from "@/lib/dashboard/build-leaderboard";
import { countLabel } from "@/lib/text/count-label";

/** Every contributor ranked by songs added, with the viewer's own row highlighted. Scrolls within the card once it gets long. */
function LeaderboardCard({ leaderboard }: { leaderboard: Leaderboard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4" />
          Top contributors
        </CardTitle>
        <CardDescription>
          {countLabel(leaderboard.totalContributors, "contributor")} so far
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol
          tabIndex={0}
          aria-label="Contributors ranked by songs added"
          className="-mx-1 flex max-h-[32rem] flex-col gap-1 overflow-y-auto px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {leaderboard.entries.map((entry) => (
            <li
              key={entry.userId}
              aria-current={entry.isYou ? "true" : undefined}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${entry.isYou ? "bg-muted font-medium" : ""}`}
            >
              <span className="w-6 text-right text-muted-foreground tabular-nums">
                {entry.rank}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {entry.name}
                {entry.isYou && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (you)
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {countLabel(entry.count, "song")}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export { LeaderboardCard };
