import { notFound, redirect } from "next/navigation";
import { SongDetailsView } from "@/components/songs/song-details-view";
import { getSession } from "@/lib/auth/auth";
import { getSongDetails } from "@/lib/queries/song-details";

/**
 * Loads the song named by a route's `id` param and shows its details. Used
 * by both the full page and the modal, so they share one sign-in check, one
 * id parse, and one query. A missing song is a real 404 on the full page,
 * but a short message inside the modal -- a 404 page would replace the list
 * the modal is sitting on top of.
 */
async function SongDetailsLoader({
  params,
  headingLevel,
  whenMissing,
}: {
  params: Promise<{ id: string }>;
  headingLevel: "h1" | "h2";
  whenMissing: "not-found" | "message";
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const songId = Number(id);
  const details =
    Number.isInteger(songId) && songId > 0
      ? await getSongDetails(songId)
      : null;

  if (details) {
    return <SongDetailsView details={details} headingLevel={headingLevel} />;
  }

  if (whenMissing === "not-found") {
    notFound();
  }

  return (
    <p className="py-6 text-center text-muted-foreground">
      That song couldn&apos;t be found.
    </p>
  );
}

export { SongDetailsLoader };
