"use client";

import {
  searchArtistOptions,
  searchCoverSongOptions,
} from "@/lib/actions/search-adapters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreatableAutocomplete,
  type CreatableOption,
  type CreatableSelection,
} from "./creatable-autocomplete";

interface CoverFieldProps {
  choice: CreatableSelection<CreatableOption> | null;
  onChoiceChange: (choice: CreatableSelection<CreatableOption> | null) => void;
  newArtist: CreatableSelection<CreatableOption> | null;
  onNewArtistChange: (
    artist: CreatableSelection<CreatableOption> | null,
  ) => void;
  newTitle: string;
  onNewTitleChange: (title: string) => void;
}

/**
 * Lets the user mark the new song as a cover of an existing song, or of a
 * brand-new "original" song (and its artist) that doesn't exist yet.
 */
function CoverField({
  choice,
  onChoiceChange,
  newArtist,
  onNewArtistChange,
  newTitle,
  onNewTitleChange,
}: CoverFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <CreatableAutocomplete
        label="Cover of"
        placeholder="Search songs…"
        search={searchCoverSongOptions}
        value={choice}
        onChange={onChoiceChange}
      />
      {choice?.kind === "new" && (
        <div className="flex flex-col gap-3 pl-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cover-title">Original title</Label>
            <Input
              id="cover-title"
              value={newTitle}
              onChange={(event) => onNewTitleChange(event.target.value)}
              required
            />
          </div>
          <CreatableAutocomplete
            label="Original artist"
            placeholder="Search artists…"
            search={searchArtistOptions}
            value={newArtist}
            onChange={onNewArtistChange}
          />
        </div>
      )}
    </div>
  );
}

export { CoverField };
