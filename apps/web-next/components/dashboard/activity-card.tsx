import { ChartColumn } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ActivitySummary,
  YearBucket,
} from "@/lib/dashboard/activity-by-year";
import { countLabel } from "@/lib/text/count-label";

/** Songs added per year as a bar chart, with the busiest year called out. */
function ActivityCard({
  buckets,
  summary,
}: {
  buckets: YearBucket[];
  summary: ActivitySummary | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartColumn className="size-4" />
          Songs added by year
        </CardTitle>
        <CardDescription>
          {summary
            ? `Busiest year: ${summary.busiestYear} with ${countLabel(summary.busiestCount, "song")}`
            : "Your activity will show up here"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {buckets.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No songs added yet.
          </p>
        ) : (
          <ol
            aria-label="Songs added per year"
            className="flex h-44 items-stretch gap-2"
          >
            {buckets.map((bucket) => (
              <li
                key={bucket.year}
                aria-label={`${bucket.year}: ${countLabel(bucket.count, "song")}`}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <span className="text-xs text-muted-foreground tabular-nums">
                  {bucket.count.toLocaleString("en-US")}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    aria-hidden="true"
                    className="w-full rounded-t bg-primary"
                    style={{
                      height: `${Math.max(bucket.share * 100, bucket.count > 0 ? 3 : 1)}%`,
                      opacity: bucket.count > 0 ? 1 : 0.2,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {bucket.year}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export { ActivityCard };
