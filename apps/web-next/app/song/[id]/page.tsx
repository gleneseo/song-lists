import { Suspense } from "react";
import { SongDetailsLoader } from "@/components/songs/song-details-loader";

export default function SongPage({ params }: PageProps<"/song/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense
        fallback={<p className="text-muted-foreground">Loading song…</p>}
      >
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <SongDetailsLoader
            params={params}
            headingLevel="h1"
            whenMissing="not-found"
          />
        </div>
      </Suspense>
    </main>
  );
}
