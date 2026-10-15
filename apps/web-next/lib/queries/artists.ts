import { sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { db } from "./client";

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

  return db
    .select({ id: schema.artists.id, name: schema.artists.name })
    .from(schema.artists)
    .where(
      sql`(${schema.artists.name} % ${trimmed} OR ${schema.artists.name} ILIKE ${`%${trimmed}%`})`,
    )
    .orderBy(sql`similarity(${schema.artists.name}, ${trimmed}) DESC`)
    .limit(limit);
}

export { searchArtists };
export type { ArtistOption };
