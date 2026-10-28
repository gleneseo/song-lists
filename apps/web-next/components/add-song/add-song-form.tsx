"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  checkDuplicateSong,
  createSong,
  type CreateSongInput,
} from "@/lib/actions/add-song";
import type { ListOption } from "@/lib/queries/lists";
import type { ProductionTypeOption } from "@/lib/queries/productions";
import type { DuplicateCheckResult } from "@/lib/queries/songs";
import type { UserOption } from "@/lib/queries/users";
import type { StyleIssue } from "@/lib/songs/name-style";
import {
  toArtistSelection,
  toCoverSelection,
  toProductionSelection,
} from "@/lib/songs/build-create-song-selections";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cameFromThisApp } from "@/lib/navigation/came-from-this-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SongDetailsFields } from "@/components/songs/song-details-fields";
import {
  detailsToSave,
  EMPTY_SONG_DETAILS,
} from "@/lib/songs/song-details-input";
import { CheckboxList } from "./checkbox-list";
import { CoverField } from "./cover-field";
import {
  CreatableAutocomplete,
  selectionLabel,
  type CreatableOption,
  type CreatableSelection,
} from "./creatable-autocomplete";
import { CreatableCombobox } from "./creatable-combobox";
import { NameStylePanel } from "./name-style-panel";
import { SimilarSongNotice } from "./similar-song-notice";
import { ProductionField } from "./production-field";
import { searchArtistOptions } from "@/lib/actions/search-adapters";

interface AddedSongSummary {
  title: string;
  artistLabel: string;
  featuredArtistLabels: string[];
  productionLabel: string | null;
  coverLabel: string | null;
  listNames: string[];
  advocateNames: string[];
}

interface AddSongFormProps {
  lists: ListOption[];
  productionTypes: ProductionTypeOption[];
  advocateCandidates: UserOption[];
}

function AddSongForm({
  lists,
  productionTypes,
  advocateCandidates,
}: AddSongFormProps) {
  const router = useRouter();

  const [artist, setArtist] =
    useState<CreatableSelection<CreatableOption> | null>(null);
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [featuredArtists, setFeaturedArtists] = useState<
    CreatableSelection<CreatableOption>[]
  >([]);

  const [productionChoice, setProductionChoice] =
    useState<CreatableSelection<CreatableOption> | null>(null);
  const [releaseYear, setReleaseYear] = useState("");
  const [typeId, setTypeId] = useState<number | null>(
    productionTypes[0]?.id ?? null,
  );

  const [coverChoice, setCoverChoice] =
    useState<CreatableSelection<CreatableOption> | null>(null);
  const [coverNewArtist, setCoverNewArtist] =
    useState<CreatableSelection<CreatableOption> | null>(null);
  const [coverNewTitle, setCoverNewTitle] = useState("");

  const [listIds, setListIds] = useState<number[]>(() =>
    lists[0] ? [lists[0].id] : [],
  );
  const [advocateIds, setAdvocateIds] = useState<string[]>([]);

  const [details, setDetails] = useState(EMPTY_SONG_DETAILS);
  const [lookingUp, setLookingUp] = useState(false);

  const [duplicateCheck, setDuplicateCheck] =
    useState<DuplicateCheckResult | null>(null);
  const [styleIssues, setStyleIssues] = useState<StyleIssue[]>([]);
  const [styleOverrides, setStyleOverrides] = useState<string[]>([]);
  const [styleAttempt, setStyleAttempt] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<AddedSongSummary | null>(null);

  const debouncedTitle = useDebouncedValue(title, 400);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (artist?.kind !== "existing" || !debouncedTitle.trim()) {
        if (!cancelled) {
          setDuplicateCheck(null);
        }
        return;
      }

      try {
        const result = await checkDuplicateSong({
          artistId: artist.option.id,
          title: debouncedTitle,
        });

        if (!cancelled) {
          setDuplicateCheck(result);
        }
      } catch {
        // The page moved on while this was out; there's nothing to show.
        if (!cancelled) {
          setDuplicateCheck(null);
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [artist, debouncedTitle]);

  /** Back to an empty form, as when it was first opened. */
  function resetForm() {
    setArtist(null);
    setTitle("");
    setBio("");
    setFeaturedArtists([]);
    setProductionChoice(null);
    setReleaseYear("");
    setTypeId(productionTypes[0]?.id ?? null);
    setCoverChoice(null);
    setCoverNewArtist(null);
    setCoverNewTitle("");
    setListIds(lists[0] ? [lists[0].id] : []);
    setAdvocateIds([]);
    setDetails(EMPTY_SONG_DETAILS);
    setDuplicateCheck(null);
    setStyleIssues([]);
    setStyleOverrides([]);
  }

  // Next keeps a page's state alive while it's out of sight, so that going
  // back finds it as it was. A form half filled in and then cancelled would
  // come back that way, so it's emptied as it goes out of sight.
  const resetOnLeave = useRef<() => void>(() => undefined);

  useEffect(() => {
    resetOnLeave.current = () => {
      resetForm();
      setSummary(null);
      setError("");
    };
  });

  useEffect(() => () => resetOnLeave.current(), []);

  /** Leaves the form for wherever the person came from, or the dashboard if they landed here directly. */
  function cancel() {
    if (cameFromThisApp(window)) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  }

  /** Puts our suggested spelling back into the field the name came from. */
  function applySuggestion({ field, suggestion }: StyleIssue) {
    const rename = <T extends CreatableSelection<CreatableOption>>(
      selection: T | null,
    ): T | null =>
      selection?.kind === "new"
        ? { ...selection, name: suggestion }
        : selection;

    if (field === "title") {
      setTitle(suggestion);
    } else if (field === "artist") {
      setArtist(rename);
    } else if (field === "production") {
      setProductionChoice(rename);
    } else if (field === "coverTitle") {
      setCoverNewTitle(suggestion);
    } else if (field === "coverArtist") {
      setCoverNewArtist(rename);
    } else {
      const index = Number(field.slice("featured:".length));

      setFeaturedArtists((current) =>
        current.map((selection, position) =>
          position === index ? (rename(selection) ?? selection) : selection,
        ),
      );
    }

    setStyleIssues((current) =>
      current.filter((issue) => issue.field !== field),
    );
  }

  function toggleStyleOverride(text: string, checked: boolean) {
    setStyleOverrides((current) =>
      checked
        ? [...current.filter((name) => name !== text), text]
        : current.filter((name) => name !== text),
    );
  }

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

    setSubmitting(true);

    try {
      const input: CreateSongInput = {
        artist: toArtistSelection(artist),
        title,
        bio: bio.trim() ? bio : undefined,
        featuredArtists: featuredArtists.map(toArtistSelection),
        production: toProductionSelection(
          productionChoice,
          releaseYear,
          typeId,
        ),
        cover: toCoverSelection(coverChoice, coverNewArtist, coverNewTitle),
        listIds,
        advocateUserIds: advocateIds,
        styleOverrides,
        ...(detailsToSave(details) ? { details: detailsToSave(details) } : {}),
      };

      const result = await createSong(input);

      if (result.status === "created") {
        const productionLabel = !productionChoice
          ? null
          : productionChoice.kind === "existing"
            ? productionChoice.option.label
            : `${productionChoice.name} (${releaseYear}, ${productionTypes.find((type) => type.id === typeId)?.name ?? ""})`;

        const coverLabel = !coverChoice
          ? null
          : coverChoice.kind === "existing"
            ? coverChoice.option.label
            : `${coverNewTitle} by ${coverNewArtist ? selectionLabel(coverNewArtist) : ""}`;

        setSummary({
          title,
          artistLabel: selectionLabel(artist),
          featuredArtistLabels: featuredArtists.map(selectionLabel),
          productionLabel,
          coverLabel,
          listNames: lists
            .filter((list) => listIds.includes(list.id))
            .map((list) => list.name),
          advocateNames: [
            "You",
            ...advocateCandidates
              .filter((candidate) => advocateIds.includes(candidate.id))
              .map((candidate) => candidate.name),
          ],
        });

        resetForm();
        return;
      }

      if (result.status === "style") {
        setStyleIssues(result.issues);
        setStyleAttempt((attempt) => attempt + 1);
        return;
      }

      if (result.status === "duplicate") {
        setError(
          `"${result.existing.title}" by ${result.existing.artistName} already exists.`,
        );
        return;
      }

      setError(result.message);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to add the song.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (summary) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">
              &ldquo;{summary.title}&rdquo; by {summary.artistLabel} was added
              successfully.
            </p>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  Featured artists:{" "}
                </span>
                {summary.featuredArtistLabels.length > 0
                  ? summary.featuredArtistLabels.join(", ")
                  : "None"}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Production:{" "}
                </span>
                {summary.productionLabel ?? "None"}
              </p>
              <p>
                <span className="font-medium text-foreground">Cover of: </span>
                {summary.coverLabel ?? "Not a cover"}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Added to lists:{" "}
                </span>
                {summary.listNames.length > 0
                  ? summary.listNames.join(", ")
                  : "None"}
              </p>
              <p>
                <span className="font-medium text-foreground">Advocates: </span>
                {summary.advocateNames.join(", ")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setSummary(null)}>Add another song</Button>
          <Button
            variant="outline"
            onClick={() => {
              setSummary(null);
              router.push("/lists");
              router.refresh();
            }}
          >
            View lists
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Song</h2>
        <CreatableAutocomplete
          label="Artist"
          placeholder="Search artists…"
          search={searchArtistOptions}
          value={artist}
          onChange={setArtist}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="song-title">Title</Label>
          <Input
            id="song-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        {duplicateCheck?.exact && (
          <p className="text-sm text-destructive">
            &ldquo;{duplicateCheck.exact.title}&rdquo; by{" "}
            {duplicateCheck.exact.artistName} already exists -- pick a different
            title, or this song doesn&rsquo;t need to be added again.
          </p>
        )}
        {!duplicateCheck?.exact && duplicateCheck?.near && (
          <SimilarSongNotice
            match={duplicateCheck.near}
            onCancel={cancel}
            disabled={submitting}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Album details</h2>
        <p className="text-sm text-muted-foreground">
          Look the song up to fill in its album, year, and cover art, then
          correct anything before adding it. Left blank, they&rsquo;re looked up
          automatically once the song is added.
        </p>
        <SongDetailsFields
          idPrefix="song-details"
          title={title}
          artistName={artist ? selectionLabel(artist) : ""}
          value={details}
          onChange={setDetails}
          onBusyChange={setLookingUp}
          onUseTitle={setTitle}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Notes</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="song-bio">Bio / notes (optional)</Label>
          <Textarea
            id="song-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Featured artists</h2>
        <CreatableCombobox
          label="Featured artists"
          placeholder="Search artists…"
          search={searchArtistOptions}
          values={featuredArtists}
          onChange={setFeaturedArtists}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Production</h2>
        <ProductionField
          productionTypes={productionTypes}
          choice={productionChoice}
          onChoiceChange={setProductionChoice}
          releaseYear={releaseYear}
          onReleaseYearChange={setReleaseYear}
          typeId={typeId}
          onTypeIdChange={setTypeId}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Cover</h2>
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
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Lists</h2>
        <CheckboxList
          label="Add this song to"
          options={lists}
          selectedIds={listIds}
          onChange={setListIds}
          maxRows={3}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Advocates</h2>
        <p className="text-sm text-muted-foreground">
          You&rsquo;re automatically an advocate for this song. Pick anyone else
          who should be too.
        </p>
        <CheckboxList
          label="Additional advocates"
          options={advocateCandidates}
          selectedIds={advocateIds}
          onChange={setAdvocateIds}
          layout="tiles"
          maxRows={3}
        />
      </section>

      {styleIssues.length > 0 && (
        <NameStylePanel
          key={styleAttempt}
          issues={styleIssues}
          overrides={styleOverrides}
          onUseSuggestion={applySuggestion}
          onToggleOverride={toggleStyleOverride}
        />
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={cancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={submitting || lookingUp || !!duplicateCheck?.exact}
        >
          {submitting ? "Adding song…" : "Add song"}
        </Button>
      </div>
    </form>
  );
}

export { AddSongForm };
