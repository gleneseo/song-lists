import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** A single at-a-glance number with a label and a one-line caption. */
function StatCard({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <p className="text-xs font-medium tracking-wide uppercase">{label}</p>
        </div>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

export { StatCard };
