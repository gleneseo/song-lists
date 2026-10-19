import { Award, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SONG_MILESTONES,
  type MilestoneProgress,
} from "@/lib/dashboard/milestones";
import { countLabel } from "@/lib/text/count-label";

/** Song-count badges the viewer has earned, and a progress bar toward the next. */
function MilestonesCard({
  songCount,
  progress,
}: {
  songCount: number;
  progress: MilestoneProgress;
}) {
  const { earned, next } = progress;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="size-4" />
          Milestones
        </CardTitle>
        <CardDescription>
          {next
            ? `${countLabel(next.remaining, "song")} to your next badge`
            : "You've earned every badge. Legend."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-wrap gap-2">
          {SONG_MILESTONES.map((target) => {
            const isEarned = earned.includes(target);

            return (
              <li
                key={target}
                aria-label={`${target.toLocaleString("en-US")} songs: ${isEarned ? "earned" : "locked"}`}
                className={
                  isEarned
                    ? "flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-full px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-border"
                }
              >
                {isEarned && <Check className="size-3" />}
                {target.toLocaleString("en-US")}
              </li>
            );
          })}
        </ul>
        {next && (
          <div className="flex flex-col gap-1.5">
            <div
              role="progressbar"
              aria-label={`Progress to ${next.target.toLocaleString("en-US")} songs`}
              aria-valuemin={0}
              aria-valuemax={next.target}
              aria-valuenow={songCount}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${next.progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {songCount.toLocaleString("en-US")} of{" "}
              {next.target.toLocaleString("en-US")} songs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { MilestonesCard };
