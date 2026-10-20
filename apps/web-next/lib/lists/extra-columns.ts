import {
  LIST_EXTRA_COLUMN,
  type ListExtraColumn,
} from "@song-lists/db/list-extra-column";
import type { SortColumn } from "./list-view";

const KNOWN_COLUMNS: readonly string[] = Object.values(LIST_EXTRA_COLUMN);

/** The sorts every list offers, whatever optional columns it has turned on. */
const BASE_SORTS: readonly SortColumn[] = [
  "added",
  "addedBy",
  "title",
  "artist",
];

/**
 * Narrows the free text stored in a list's `extra_columns` to the optional
 * columns this app knows how to show. A leftover or misspelled name is
 * dropped rather than trusted, and repeats collapse to one.
 */
function parseExtraColumns(values: readonly string[]): ListExtraColumn[] {
  return [...new Set(values)].filter((value): value is ListExtraColumn =>
    KNOWN_COLUMNS.includes(value),
  );
}

function showsProductions(columns: readonly ListExtraColumn[]): boolean {
  return columns.includes(LIST_EXTRA_COLUMN.PRODUCTIONS);
}

/** The sort columns a list's page accepts: the base ones plus one per optional column that can be sorted. */
function sortsFor(columns: readonly ListExtraColumn[]): readonly SortColumn[] {
  return showsProductions(columns) ? [...BASE_SORTS, "production"] : BASE_SORTS;
}

export { BASE_SORTS, parseExtraColumns, showsProductions, sortsFor };
