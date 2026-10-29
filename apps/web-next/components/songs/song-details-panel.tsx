"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SongDetailsView } from "@/components/songs/song-details-view";
import { SongNoteForm } from "@/components/songs/song-note-form";
import { SongEditForm } from "@/components/songs/song-edit-form";
import { EditButton } from "@/components/edit-button";
import type { SongDetails } from "@/lib/songs/song-details";

/**
 * A song's details, with -- for admins and managers -- a button that swaps
 * them for an edit form in place: the full form for an admin, a single
 * add-a-note box for a manager. Shared by the full page and the modal, like
 * the view it wraps. `editorRole` only decides which form the button opens;
 * the server checks the role again on every load and save.
 */
function SongDetailsPanel({
  details,
  headingLevel,
  editorRole,
}: {
  details: SongDetails;
  headingLevel: "h1" | "h2";
  editorRole: "admin" | "manager" | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing && editorRole === "manager") {
    return (
      <SongNoteForm
        songId={details.id}
        title={details.title}
        notes={details.notes}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

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
        editorRole ? <EditButton onClick={() => setEditing(true)} /> : null
      }
    />
  );
}

export { SongDetailsPanel };
