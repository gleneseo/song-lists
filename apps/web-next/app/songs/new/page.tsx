import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AddSongForm } from "@/components/add-song/add-song-form";
import { getAdminUserId } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/auth";
import { getLists } from "@/lib/queries/lists";
import { getProductionTypes } from "@/lib/queries/productions";
import { getAdvocateCandidates } from "@/lib/queries/users";

async function NewSong() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const [lists, productionTypes, advocateCandidates, adminUserId] =
    await Promise.all([
      getLists(),
      getProductionTypes(),
      getAdvocateCandidates(session.user.id),
      getAdminUserId(),
    ]);

  return (
    <AddSongForm
      lists={lists}
      productionTypes={productionTypes}
      advocateCandidates={advocateCandidates}
      isAdmin={adminUserId !== null}
    />
  );
}

export default function NewSongPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Add a song</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <NewSong />
      </Suspense>
    </main>
  );
}
