import { schema } from "@song-lists/db";

/**
 * Aggregate functions (min, max, ...) hand timestamps back as raw strings.
 * Decode them with a timestamp column's own mapper so they land on the same
 * instant as every other timestamp Drizzle reads -- naive timestamps are
 * taken as UTC.
 */
function decodeTimestamp(value: string | null): Date | null {
  return value === null
    ? null
    : (schema.songs.createdAt.mapFromDriverValue(value) as Date);
}

export { decodeTimestamp };
