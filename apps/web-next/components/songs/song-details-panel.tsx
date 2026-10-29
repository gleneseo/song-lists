"use client";

import { useEffect, useRef, useState } from "react";
import { largestArtworkUrl } from "@song-lists/song-metadata/artwork";
import { useRouter } from "next/navigation";
import { albumLine } from "@/lib/songs/album-line";
import { LargeSongArtwork } from "@/components/songs/large-song-artwork";
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
  const [viewingArt, setViewingArt] = useState(false);
  const wasViewingArt = useRef(false);
  const artworkUrl = details.metadata?.artworkUrl ?? null;
  const albumName = details.metadata?.albumName ?? null;

  // Back from the large art, the art it came from has the focus again.
  useEffect(() => {
    if (wasViewingArt.current && !viewingArt) {
      document.querySelector<HTMLElement>("[data-artwork-button]")?.focus();
    }

    wasViewingArt.current = viewingArt;
  }, [viewingArt]);

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

  if (viewingArt && artworkUrl) {
    return (
      <LargeSongArtwork
        src={largestArtworkUrl(artworkUrl)}
        alt={albumName ? `Album art for ${albumName}` : "Album art"}
        heading={
          albumLine(albumName, details.metadata?.releaseYear) ?? details.title
        }
        headingLevel={headingLevel}
        onClose={() => setViewingArt(false)}
      />
    );
  }

  return (
    <SongDetailsView
      details={details}
      headingLevel={headingLevel}
      onViewArt={artworkUrl ? () => setViewingArt(true) : undefined}
      footerAction={
        editorRole ? <EditButton onClick={() => setEditing(true)} /> : null
      }
    />
  );
}

export { SongDetailsPanel };
