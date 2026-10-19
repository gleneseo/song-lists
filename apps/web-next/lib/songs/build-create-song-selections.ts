import type {
  ArtistSelection,
  CoverSelection,
  ProductionSelection,
} from "@/lib/actions/add-song";
import type {
  CreatableOption,
  CreatableSelection,
} from "@/components/add-song/creatable-autocomplete";

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

  if (typeId === null || !releaseYear.trim() || !Number.isFinite(parsedYear)) {
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

export { toArtistSelection, toCoverSelection, toProductionSelection };
