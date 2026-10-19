import { Schema } from "effect";

/**
 * The optional extra columns a list's page can show.
 *
 * A list stores the ones it turns on as free text in `lists.extra_columns`
 * (empty by default, so a list shows only the standard columns). This is the
 * single source of truth every app validates and narrows against -- adding an
 * optional column means adding it here, with no database migration.
 */
const LIST_EXTRA_COLUMN = {
  PRODUCTIONS: "productions",
} as const;

const ListExtraColumn = Schema.Literals([LIST_EXTRA_COLUMN.PRODUCTIONS]);

type ListExtraColumn = Schema.Schema.Type<typeof ListExtraColumn>;

export { LIST_EXTRA_COLUMN, ListExtraColumn };
