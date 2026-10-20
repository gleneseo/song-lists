"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SongDetailsView } from "@/components/songs/song-details-view";
import { SongEditForm } from "@/components/songs/song-edit-form";
import { EditButton } from "@/components/edit-button";
import type { SongDetails } from "@/lib/songs/song-details";

/**
 * A song's details, with -- for admins -- a button that swaps them for an
 * edit form in place. Shared by the full page and the modal, like the view
 * it wraps. `canEdit` only decides whether the button shows; the server
 * checks the role again on every load and save.
 */
function SongDetailsPanel({
  details,
  headingLevel,
  canEdit,
}: {
  details: SongDetails;
  headingLevel: "h1" | "h2";
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <SongEditForm
        songId={details.id}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <SongDetailsView
      details={details}
      headingLevel={headingLevel}
      footerAction={
        canEdit ? <EditButton onClick={() => setEditing(true)} /> : null
      }
    />
  );
}

export { SongDetailsPanel };
