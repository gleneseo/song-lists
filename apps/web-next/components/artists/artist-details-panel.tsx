"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArtistDetailsView } from "@/components/artists/artist-details-view";
import { ArtistEditForm } from "@/components/artists/artist-edit-form";
import { EditButton } from "@/components/edit-button";
import type { ArtistDetails } from "@/lib/artists/artist-details";

/**
 * An artist's details, with -- for admins -- a button that swaps them for an
 * edit form in place. `canEdit` only decides whether the button shows; the
 * server checks the role again on every save.
 */
function ArtistDetailsPanel({
  details,
  headingLevel,
  canEdit,
}: {
  details: ArtistDetails;
  headingLevel: "h1" | "h2";
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ArtistEditForm
        artistId={details.id}
        initialName={details.name}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <ArtistDetailsView
      details={details}
      headingLevel={headingLevel}
      footerAction={
        canEdit ? <EditButton onClick={() => setEditing(true)} /> : null
      }
    />
  );
}

export { ArtistDetailsPanel };
