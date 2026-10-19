"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { SongDetailsView } from "@/components/songs/song-details-view";
import { SongEditForm } from "@/components/songs/song-edit-form";
import { Button } from "@/components/ui/button";
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
        canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil />
            Edit
          </Button>
        ) : null
      }
    />
  );
}

export { SongDetailsPanel };
