"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import {
  checkDuplicateSong,
  createSong,
  type ArtistSelection,
  type CoverSelection,
  type CreateSongInput,
  type ProductionSelection,
} from "@/lib/actions/add-song";
import type { ListOption } from "@/lib/queries/lists";
import type { ProductionTypeOption } from "@/lib/queries/productions";
import type { DuplicateCheckResult } from "@/lib/queries/songs";
import type { UserOption } from "@/lib/queries/users";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxList } from "./checkbox-list";
import { CoverField } from "./cover-field";
import {
  CreatableAutocomplete,
  type CreatableOption,
  type CreatableSelection,
} from "./creatable-autocomplete";
import { CreatableCombobox } from "./creatable-combobox";
import { ProductionField } from "./production-field";
import { searchArtistOptions } from "@/lib/actions/search-adapters";

function toArtistSelection(
  selection: CreatableSelection<CreatableOption>,
): ArtistSelection {
  return selection.kind === "existing"
    ? { kind: "existing", id: selection.option.id }
    : { kind: "new", name: selection.name };
}

function toProductionSelection(
  choice: CreatableSelection<CreatableOption> | null,
  releaseYear: string,
  typeId: number | null,
): ProductionSelection {
  if (!choice) {
    return null;
  }

  if (choice.kind === "existing") {
    return { kind: "existing", id: choice.option.id };
  }

  const parsedYear = Number(releaseYear);

  if (typeId === null || !Number.isFinite(parsedYear)) {
    throw new Error("Release year and type are required for a new production.");
  }

  return { kind: "new", name: choice.name, releaseYear: parsedYear, typeId };
}

function toCoverSelection(
  choice: CreatableSelection<CreatableOption> | null,
  newArtist: CreatableSelection<CreatableOption> | null,
  newTitle: string,
): CoverSelection {
  if (!choice) {
    return null;
  }

  if (choice.kind === "existing") {
    return { kind: "existing", songId: choice.option.id };
  }

  if (!newArtist) {
    throw new Error("An artist is required for the new original song.");
  }

  return {
    kind: "new",
    title: newTitle,
    artist: toArtistSelection(newArtist),
  };
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

  const [duplicateCheck, setDuplicateCheck] =
    useState<DuplicateCheckResult | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

      const result = await checkDuplicateSong({
        artistId: artist.option.id,
        title: debouncedTitle,
      });

      if (!cancelled) {
        setDuplicateCheck(result);
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [artist, debouncedTitle]);

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
      };

      const result = await createSong(input);

      if (result.status === "created") {
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
        setDuplicateCheck(null);
        router.push("/songs");
        router.refresh();
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
          <p className="text-sm text-muted-foreground">
            Did you mean the existing song &ldquo;{duplicateCheck.near.title}
            &rdquo; by {duplicateCheck.near.artistName}? You can still continue
            if this is a different song.
          </p>
        )}
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
        />
      </section>

      <Button type="submit" disabled={submitting || !!duplicateCheck?.exact}>
        {submitting ? "Adding song…" : "Add song"}
      </Button>
    </form>
  );
}

export { AddSongForm };
