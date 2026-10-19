import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** A pulsing placeholder card shown while a dashboard section streams in. */
function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="h-4 animate-pulse rounded bg-muted" />
        ))}
      </CardContent>
    </Card>
  );
}

export { CardSkeleton };
