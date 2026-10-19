import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SongDetailsLoader } from "@/components/songs/song-details-loader";

export default function SongPage({ params }: PageProps<"/song/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2.5"
        nativeButton={false}
        render={<Link href="/lists" />}
      >
        <ArrowLeft />
        All lists
      </Button>
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
