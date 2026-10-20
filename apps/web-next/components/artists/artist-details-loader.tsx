import { notFound, redirect } from "next/navigation";
import { ArtistDetailsPanel } from "@/components/artists/artist-details-panel";
import { getSession } from "@/lib/auth/auth";
import { getArtistDetails } from "@/lib/queries/artist-details";
import { isAdminUser } from "@/lib/queries/users";

/**
 * Loads the artist named by a route's `id` param and shows their details,
 * for both the full page and the modal. Admins also get the Edit button. A
 * missing artist is a real 404 on the full page, but a short message inside
 * the modal -- a 404 page would replace the list the modal sits on.
 */
async function ArtistDetailsLoader({
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
  const canEdit = await isAdminUser(session.user.id);
  const artistId = Number(id);
  const details =
    Number.isInteger(artistId) && artistId > 0
      ? await getArtistDetails(artistId)
      : null;

  if (details) {
    return (
      <ArtistDetailsPanel
        details={details}
        headingLevel={headingLevel}
        canEdit={canEdit}
      />
    );
  }

  if (whenMissing === "not-found") {
    notFound();
  }

  return (
    <p className="py-6 text-center text-muted-foreground">
      That artist couldn&apos;t be found.
    </p>
  );
}

export { ArtistDetailsLoader };
