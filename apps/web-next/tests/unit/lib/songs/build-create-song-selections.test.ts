import { describe, expect, it } from "vitest";
import {
  toArtistSelection,
  toCoverSelection,
  toProductionSelection,
} from "@/lib/songs/build-create-song-selections";
import type { CreatableSelection } from "@/components/add-song/creatable-autocomplete";

interface Option {
  id: number;
  label: string;
}

const existingOption: CreatableSelection<Option> = {
  kind: "existing",
  option: { id: 7, label: "ZZ Top" },
};

const newOption: CreatableSelection<Option> = {
  kind: "new",
  name: "The Lonesome Yodeller",
};

describe("toArtistSelection", () => {
  it("should pass through an existing option's id", () => {
    expect(toArtistSelection(existingOption)).toEqual({
      kind: "existing",
      id: 7,
    });
  });

  it("should pass through a new option's name", () => {
    expect(toArtistSelection(newOption)).toEqual({
      kind: "new",
      name: "The Lonesome Yodeller",
    });
  });
});

describe("toProductionSelection", () => {
  it("should return null when nothing was chosen", () => {
    expect(toProductionSelection(null, "", null)).toBeNull();
  });

  it("should pass through an existing production's id, ignoring year and type", () => {
    expect(toProductionSelection(existingOption, "", null)).toEqual({
      kind: "existing",
      id: 7,
    });
  });

  it("should build a new production from a valid year and type", () => {
    expect(toProductionSelection(newOption, "1983", 2)).toEqual({
      kind: "new",
      name: "The Lonesome Yodeller",
      releaseYear: 1983,
      typeId: 2,
    });
  });

  it("should throw when a new production has no type selected", () => {
    expect(() => toProductionSelection(newOption, "1983", null)).toThrow(
      "Release year and type are required for a new production.",
    );
  });

  it("should throw when a new production's release year isn't a number", () => {
    expect(() => toProductionSelection(newOption, "", 2)).toThrow(
      "Release year and type are required for a new production.",
    );
  });
});

describe("toCoverSelection", () => {
  it("should return null when nothing was chosen", () => {
    expect(toCoverSelection(null, null, "")).toBeNull();
  });

  it("should pass through an existing song's id, ignoring the new-song fields", () => {
    expect(toCoverSelection(existingOption, null, "")).toEqual({
      kind: "existing",
      songId: 7,
    });
  });

  it("should build a new original song from its title and artist", () => {
    expect(toCoverSelection(newOption, existingOption, "La Grange")).toEqual({
      kind: "new",
      title: "La Grange",
      artist: { kind: "existing", id: 7 },
    });
  });

  it("should throw when a new original song has no artist selected", () => {
    expect(() => toCoverSelection(newOption, null, "La Grange")).toThrow(
      "An artist is required for the new original song.",
    );
  });
});
