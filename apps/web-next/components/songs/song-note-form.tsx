"use client";

import { useState, type SubmitEvent } from "react";
import { ENTITY_HEADING_ID } from "@/components/entity-heading";
import { NoteLines } from "@/components/songs/note-lines";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addSongNote } from "@/lib/actions/add-song-note";
import type { SongNote } from "@/lib/songs/song-details";

/**
 * The manager's edit form: the song's existing notes for context, and one box
 * to add a new note. It's signed and dated on the server.
 */
function SongNoteForm({
  songId,
  title,
  notes,
  onCancel,
  onSaved,
}: {
  songId: number;
  title: string;
  notes: SongNote[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!text.trim()) {
      setError("Write a note first.");
      return;
    }

    setSaving(true);

    try {
      const result = await addSongNote({ songId, text });

      if (result.status === "added") {
        onSaved();
        return;
      }

      setError(result.message);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to add the note.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h2
        id={ENTITY_HEADING_ID}
        className="pr-8 text-xl leading-snug font-semibold wrap-anywhere"
      >
        Add a note to {title}
      </h2>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {notes.length > 0 && (
        <NoteLines notes={notes} className="max-h-48 overflow-y-auto text-sm" />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="add-song-note">New note</Label>
        <Textarea
          id="add-song-note"
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoFocus
          required
        />
        <p className="text-xs text-muted-foreground">
          Your name and the date and time (Pacific) are added after it.
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}

export { SongNoteForm };
