import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SongSearch } from "@/components/song-search";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/auth";
import { getSongs } from "@/lib/queries/songs";

async function Songs() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const songs = await getSongs();

  return <SongSearch songs={songs} />;
}

export default function SongsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Songs</h1>
        <Button nativeButton={false} render={<Link href="/songs/new" />}>
          + Add Song
        </Button>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground">Loading songs…</p>}
      >
        <Songs />
      </Suspense>
    </main>
  );
}
