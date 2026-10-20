import { USER_ROLE } from "@song-lists/db/user-role";
import { notFound, redirect } from "next/navigation";
import { SongDetailsPanel } from "@/components/songs/song-details-panel";
import { getSession } from "@/lib/auth/auth";
import { getSongDetails } from "@/lib/queries/song-details";
import { getUserAccess } from "@/lib/queries/users";

/**
 * Loads the song named by a route's `id` param and shows its details. Used
 * by both the full page and the modal, so they share one sign-in check, one
 * ID parse, and one query. Admins and managers also get the Edit button. A missing song is a real 404 on the full page,
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
  const access = await getUserAccess(session.user.id);
  const editorRole =
    access?.role === USER_ROLE.ADMIN || access?.role === USER_ROLE.MANAGER
      ? access.role
      : null;
  const songId = Number(id);
  const details =
    Number.isInteger(songId) && songId > 0
      ? await getSongDetails(songId)
      : null;

  if (details) {
    return (
      <SongDetailsPanel
        details={details}
        headingLevel={headingLevel}
        editorRole={editorRole}
      />
    );
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
