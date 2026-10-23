import type {
  ArtistSelection,
  CoverSelection,
  ProductionSelection,
} from "@/lib/songs/resolve-selections";
import { normalizeText } from "@/lib/text/normalize";
import { checkStyle } from "@/lib/text/title-style";

/** Which input an issue is about, so a suggestion can be put back where it came from. */
type StyleField =
  | "title"
  | "artist"
  | `featured:${number}`
  | "production"
  | "coverTitle"
  | "coverArtist";

interface StyleIssue {
  field: StyleField;
  /** Where the name is in the form, for people: "Featured artist", "Original song title". */
  where: string;
  /** What kind of name it is, for the override's wording: "title", "artist name". */
  noun: string;
  /** The name as it would be saved. */
  text: string;
  /** The same name in our style, to offer as a one-click fix. */
  suggestion: string;
}

/** What a new song is being created from, as far as new names go. */
interface NewNameSources {
  title: string;
  artist: ArtistSelection;
  featuredArtists: ArtistSelection[];
  production: ProductionSelection;
  cover: CoverSelection;
}

type NewName = Pick<StyleIssue, "field" | "where" | "noun"> & { text: string };

function newArtistName(
  selection: ArtistSelection,
  field: StyleField,
  where: string,
): NewName[] {
  return selection.kind === "new"
    ? [{ field, where, noun: "artist name", text: selection.name }]
    : [];
}

/**
 * Every name the submission would create -- the song's own title, plus any
 * artist, production, or original song that's new rather than picked from
 * what exists. Existing ones aren't ours to second-guess here.
 */
function newNamesIn(sources: NewNameSources): NewName[] {
  const names: NewName[] = [
    { field: "title", where: "Title", noun: "title", text: sources.title },
    ...newArtistName(sources.artist, "artist", "Artist"),
    ...sources.featuredArtists.flatMap((featured, index) =>
      newArtistName(featured, `featured:${index}`, "Featured artist"),
    ),
  ];

  if (sources.production?.kind === "new") {
    names.push({
      field: "production",
      where: "Production",
      noun: "production name",
      text: sources.production.name,
    });
  }

  if (sources.cover?.kind === "new") {
    names.push(
      {
        field: "coverTitle",
        where: "Original song title",
        noun: "title",
        text: sources.cover.title,
      },
      ...newArtistName(
        sources.cover.artist,
        "coverArtist",
        "Original song's artist",
      ),
    );
  }

  return names;
}

/**
 * The new names in `sources` that break our style and haven't been waved
 * through. `overrides` are names (as they'd be saved) someone has said are
 * deliberately stylized; a name that's changed since then isn't covered.
 */
function findStyleIssues(
  sources: NewNameSources,
  overrides: readonly string[],
): StyleIssue[] {
  return newNamesIn(sources).flatMap(({ text, ...name }) => {
    const normalized = normalizeText(text);
    const check = checkStyle(normalized);

    return check.ok || overrides.includes(normalized)
      ? []
      : [{ ...name, text: normalized, suggestion: check.suggestion }];
  });
}

export { findStyleIssues, newNamesIn };
export type { NewNameSources, StyleField, StyleIssue };
