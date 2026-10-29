"use client";

import { cn } from "cn";
import { useEffect, useState, type SubmitEvent } from "react";
import {
  loadSongForEdit,
  updateSong,
  type UpdateSongInput,
} from "@/lib/actions/edit-song";
import { searchArtistOptions } from "@/lib/actions/search-adapters";
import type { SongEditData } from "@/lib/queries/song-edit";
import { formatNoteByline } from "@/lib/songs/format-note";
import {
  toArtistSelection,
  toCoverSelection,
  toProductionSelection,
} from "@/lib/songs/build-create-song-selections";
import { CheckboxList } from "@/components/add-song/checkbox-list";
import { CoverField } from "@/components/add-song/cover-field";
import {
  CreatableAutocomplete,
  selectionLabel,
  type CreatableOption,
  type CreatableSelection,
} from "@/components/add-song/creatable-autocomplete";
import { CreatableCombobox } from "@/components/add-song/creatable-combobox";
import { ProductionField } from "@/components/add-song/production-field";
import { SongDetailsFields } from "@/components/songs/song-details-fields";
import { ENTITY_HEADING_ID } from "@/components/entity-heading";
import {
  detailsToSave,
  EMPTY_SONG_DETAILS,
} from "@/lib/songs/song-details-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Selection = CreatableSelection<CreatableOption>;

function existing(option: CreatableOption): Selection {
  return { kind: "existing", option };
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The form itself, mounted once the song's current values have loaded. */
function LoadedForm({
  data,
  onCancel,
  onSaved,
}: {
  data: SongEditData;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(data.title);
  const [bio, setBio] = useState(data.bio);
  const [removeNoteIds, setRemoveNoteIds] = useState<number[]>([]);
  const [newNote, setNewNote] = useState("");
  const [artist, setArtist] = useState<Selection | null>(existing(data.artist));
  const [featuredArtists, setFeaturedArtists] = useState<Selection[]>(
    data.featuredArtists.map(existing),
  );

  const [keepProductionIds, setKeepProductionIds] = useState(
    data.productions.map((production) => production.id),
  );
  const [productionChoice, setProductionChoice] = useState<Selection | null>(
    null,
  );
  const [releaseYear, setReleaseYear] = useState("");
  const [typeId, setTypeId] = useState<number | null>(
    data.productionTypes[0]?.id ?? null,
  );

  const [keepCoverSongIds, setKeepCoverSongIds] = useState(
    data.covers.map((cover) => cover.id),
  );
  const [coverChoice, setCoverChoice] = useState<Selection | null>(null);
  const [coverNewArtist, setCoverNewArtist] = useState<Selection | null>(null);
  const [coverNewTitle, setCoverNewTitle] = useState("");

  const [listIds, setListIds] = useState(data.listIds);
  const [advocateIds, setAdvocateIds] = useState(data.advocateIds);

  const [details, setDetails] = useState(data.details ?? EMPTY_SONG_DETAILS);
  const [lookingUp, setLookingUp] = useState(false);
  const [removeDetails, setRemoveDetails] = useState(false);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!artist) {
      setError("Artist is required.");
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);

    try {
      const input: UpdateSongInput = {
        songId: data.songId,
        title,
        bio,
        removeNoteIds,
        newNote,
        artist: toArtistSelection(artist),
        featuredArtists: featuredArtists.map(toArtistSelection),
        keepProductionIds,
        addProduction: toProductionSelection(
          productionChoice,
          releaseYear,
          typeId,
        ),
        keepCoverSongIds,
        addCover: toCoverSelection(coverChoice, coverNewArtist, coverNewTitle),
        listIds,
        advocateUserIds: advocateIds,
        ...(removeDetails
          ? { removeDetails: true }
          : detailsToSave(details, data.details)
            ? { details: detailsToSave(details, data.details) }
            : {}),
      };

      const result = await updateSong(input);

      if (result.status === "updated") {
        onSaved();
        return;
      }

      setError(
        result.status === "duplicate"
          ? `"${result.existing.title}" by ${result.existing.artistName} already exists.`
          : result.message,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to save the song.",
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
        Edit song
      </h2>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <FormSection title="Song">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-song-title">Title</Label>
          <Input
            id="edit-song-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <CreatableAutocomplete
          label="Artist"
          placeholder="Search artists…"
          search={searchArtistOptions}
          value={artist}
          onChange={setArtist}
        />
      </FormSection>

      <FormSection title="Album details">
        <SongDetailsFields
          idPrefix="edit-song-details"
          title={title}
          artistName={artist ? selectionLabel(artist) : ""}
          value={details}
          onChange={(next) => {
            // Typing or looking up again means the details are wanted after all.
            setDetails(next);
            setRemoveDetails(false);
          }}
          onBusyChange={setLookingUp}
          onUseTitle={setTitle}
        />
        {removeDetails ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="text-muted-foreground" role="status">
              The album details will be removed when you save.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDetails(data.details ?? EMPTY_SONG_DETAILS);
                setRemoveDetails(false);
              }}
            >
              Keep them
            </Button>
          </div>
        ) : (
          data.details && (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={lookingUp}
                onClick={() => {
                  setDetails(EMPTY_SONG_DETAILS);
                  setRemoveDetails(true);
                }}
              >
                Remove album details
              </Button>
            </div>
          )
        )}
      </FormSection>

      <FormSection title="Notes">
        {data.notes.length > 0 && (
          <ul className="flex flex-col gap-2">
            {data.notes.map((note) => {
              const removing = removeNoteIds.includes(note.id);

              return (
                <li
                  key={note.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span
                    className={cn(
                      "wrap-anywhere",
                      removing && "text-muted-foreground line-through",
                    )}
                  >
                    {note.body} —{" "}
                    {formatNoteByline(note.author, note.writtenAt)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${removing ? "Keep" : "Remove"} note: ${note.body}`}
                    onClick={() =>
                      setRemoveNoteIds(
                        removing
                          ? removeNoteIds.filter((id) => id !== note.id)
                          : [...removeNoteIds, note.id],
                      )
                    }
                  >
                    {removing ? "Keep" : "Remove"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-song-new-note">Add a note</Label>
          <Textarea
            id="edit-song-new-note"
            value={newNote}
            onChange={(event) => setNewNote(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your name and the date and time (Pacific) are added after it.
          </p>
        </div>
      </FormSection>

      <FormSection title="Bio">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-song-bio">Bio</Label>
          <Textarea
            id="edit-song-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title="Featured artists">
        <CreatableCombobox
          label="Featured artists"
          placeholder="Search artists…"
          search={searchArtistOptions}
          values={featuredArtists}
          onChange={setFeaturedArtists}
        />
      </FormSection>

      <FormSection title="Productions">
        {data.productions.length > 0 && (
          <CheckboxList
            label="Appears in"
            options={data.productions.map(({ id, label }) => ({
              id,
              name: label,
            }))}
            selectedIds={keepProductionIds}
            onChange={setKeepProductionIds}
          />
        )}
        <ProductionField
          productionTypes={data.productionTypes}
          choice={productionChoice}
          onChoiceChange={setProductionChoice}
          releaseYear={releaseYear}
          onReleaseYearChange={setReleaseYear}
          typeId={typeId}
          onTypeIdChange={setTypeId}
        />
      </FormSection>

      <FormSection title="Cover">
        {data.covers.length > 0 && (
          <CheckboxList
            label="Cover of"
            options={data.covers.map(({ id, label }) => ({
              id,
              name: label,
            }))}
            selectedIds={keepCoverSongIds}
            onChange={setKeepCoverSongIds}
          />
        )}
        <CoverField
          choice={coverChoice}
          onChoiceChange={(choice) => {
            setCoverChoice(choice);
            if (choice?.kind === "new") {
              setCoverNewTitle(choice.name);
            }
          }}
          newArtist={coverNewArtist}
          onNewArtistChange={setCoverNewArtist}
          newTitle={coverNewTitle}
          onNewTitleChange={setCoverNewTitle}
        />
      </FormSection>

      <FormSection title="Lists">
        <CheckboxList
          label="On these lists"
          options={data.lists}
          selectedIds={listIds}
          onChange={setListIds}
          maxRows={3}
        />
      </FormSection>

      <FormSection title="Advocates">
        <CheckboxList
          label="Championed by"
          options={data.advocateOptions}
          selectedIds={advocateIds}
          onChange={setAdvocateIds}
          layout="tiles"
          maxRows={3}
        />
      </FormSection>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving || lookingUp}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Loads the song's editable values (and re-checks admin access on the
 * server), then shows the edit form. Loading on demand keeps the choices --
 * every list and user -- off the page for everyone who never edits.
 */
function SongEditForm({
  songId,
  onCancel,
  onSaved,
}: {
  songId: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: SongEditData }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    loadSongForEdit(songId).then(
      (result) => {
        if (!cancelled) {
          setState(
            result.status === "ok"
              ? { status: "ready", data: result.data }
              : result,
          );
        }
      },
      () => {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Couldn't load the song for editing.",
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [songId]);

  if (state.status === "ready") {
    return (
      <LoadedForm data={state.data} onCancel={onCancel} onSaved={onSaved} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2
        id={ENTITY_HEADING_ID}
        className="pr-8 text-xl leading-snug font-semibold"
      >
        Edit song
      </h2>
      {state.status === "loading" ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
          <div>
            <Button type="button" variant="outline" onClick={onCancel}>
              Back
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export { SongEditForm };
