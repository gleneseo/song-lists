"use client";

import { useState, type SubmitEvent } from "react";
import { updateArtist } from "@/lib/actions/edit-artist";
import { ENTITY_HEADING_ID } from "@/components/entity-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** The admin form for an artist's own fields -- currently just the name. */
function ArtistEditForm({
  artistId,
  initialName,
  onCancel,
  onSaved,
}: {
  artistId: number;
  initialName: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);

    try {
      const result = await updateArtist({ artistId, name });

      if (result.status === "updated") {
        onSaved();
        return;
      }

      setError(
        result.status === "duplicate"
          ? `An artist named "${result.existingName}" already exists.`
          : result.message,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to save the artist.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h2
        id={ENTITY_HEADING_ID}
        className="pr-8 text-xl leading-snug font-semibold"
      >
        Edit artist
      </h2>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-artist-name">Name</Label>
        <Input
          id="edit-artist-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export { ArtistEditForm };
