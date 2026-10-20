import { Suspense } from "react";
import { ProductionDetailsLoader } from "@/components/productions/production-details-loader";

export default function ProductionPage({
  params,
}: PageProps<"/production/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense
        fallback={<p className="text-muted-foreground">Loading production…</p>}
      >
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <ProductionDetailsLoader
            params={params}
            headingLevel="h1"
            whenMissing="not-found"
          />
        </div>
      </Suspense>
    </main>
  );
}
