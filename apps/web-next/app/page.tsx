import { Suspense } from "react";
import { SongSearch } from "@/components/song-search";
import { getSongs } from "@/lib/songs";

async function Songs() {
  const songs = await getSongs();

  return <SongSearch songs={songs} />;
}

function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Songs</h1>
      <Suspense
        fallback={<p className="text-muted-foreground">Loading songs…</p>}
      >
        <Songs />
      </Suspense>
    </main>
  );
}

export default Page;
