import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SongSearch } from "@/components/song-search";
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

export default function DashboardPage() {
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
