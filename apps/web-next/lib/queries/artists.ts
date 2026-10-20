import { sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { readSymbols } from "@/lib/text/read-symbols";
import { db } from "./client";
import { readSymbolsSql } from "./sort-key";

interface ArtistOption {
  id: number;
  name: string;
}

/**
 * Finds existing artists whose name is a close (trigram) or substring match
 * for `query`, ordered by closeness -- typo-tolerant, so a near-miss spelling
 * still surfaces the artist it probably means instead of inviting a
 * duplicate.
 */
async function searchArtists(
  query: string,
  limit = 8,
): Promise<ArtistOption[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  // Compared with "$" and "!" read as letters, so "short" finds "Too $hort".
  const name = readSymbolsSql(schema.artists.name);
  const read = readSymbols(trimmed);

  return db
    .select({ id: schema.artists.id, name: schema.artists.name })
    .from(schema.artists)
    .where(sql`(${name} % ${read} OR ${name} ILIKE ${`%${read}%`})`)
    .orderBy(sql`similarity(${name}, ${read}) DESC`)
    .limit(limit);
}

export { searchArtists };
export type { ArtistOption };
