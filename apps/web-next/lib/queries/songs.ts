import { and, eq, sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { selectDuplicateMatches } from "@/lib/search/select-duplicate-matches";
import { readSymbols } from "@/lib/text/read-symbols";
import { db } from "./client";
import { readSymbolsSql } from "./sort-key";

interface FeaturedArtist {
  artist: { name: string };
}

interface Song {
  id: number;
  title: string;
  artist: { id: number; name: string };
  featuredArtists: FeaturedArtist[];
  /** What the album details lookup found, or `null` before it has run. */
  metadata: { status: string; artworkUrl: string | null } | null;
  coverOf: {
    original: {
      title: string;
      artist: { name: string };
      featuredArtists: FeaturedArtist[];
    };
  }[];
}

/** Shared by every song and original song fetched below. */
const featuredArtistsWith = {
  columns: { id: true },
  with: { artist: { columns: { name: true } } },
} as const;

/**
 * Shared `with` shape for every query that returns a full {@link Song} --
 * kept as one constant so the two queries below can't drift apart.
 */
const songWith = {
  artist: { columns: { id: true, name: true } },
  featuredArtists: featuredArtistsWith,
  metadata: { columns: { status: true, artworkUrl: true } },
  coverOf: {
    columns: { id: true },
    with: {
      original: {
        columns: { title: true },
        with: {
          artist: { columns: { name: true } },
          featuredArtists: featuredArtistsWith,
        },
      },
    },
  },
} as const;

interface ExistingSongMatch {
  id: number;
  resourceId: string;
  title: string;
  artistName: string;
  similarity: number;
}

interface DuplicateCheckResult {
  /** Same artist, same title once cleaned up and lowercased -- a hard match. */
  exact: ExistingSongMatch | null;
  /** Close but not exact -- worth a "did you mean" prompt, not a hard block. */
  near: ExistingSongMatch | null;
}

/**
 * Finds existing songs whose title is a close (trigram) or substring match
 * for `query`, ordered by closeness -- used by the "cover of" picker.
 */
async function searchSongs(query: string, limit = 8): Promise<Song[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  // Compared with "$" and "!" read as letters, so "short" finds "Too $hort".
  const title = readSymbolsSql(schema.songs.title);
  const read = readSymbols(trimmed);

  return db.query.songs.findMany({
    columns: { id: true, title: true },
    with: songWith,
    where: sql`(${title} % ${read} OR ${title} ILIKE ${`%${read}%`})`,
    orderBy: [sql`similarity(${title}, ${read}) DESC`],
    limit,
  });
}

/**
 * Checks whether a song by the given artist already exists under a title
 * the same as, or suspiciously close to, `normalizedTitle` (already cleaned
 * up by {@link normalizeText}).
 */
async function findExistingSong(
  artistId: number,
  normalizedTitle: string,
): Promise<DuplicateCheckResult> {
  // Compared with "$" and "!" read as letters, so "Too Short" is close enough
  // to the existing "Too $hort" to be offered as a match.
  const title = readSymbolsSql(schema.songs.title);
  const read = readSymbols(normalizedTitle);
  const candidates = await db
    .select({
      id: schema.songs.id,
      resourceId: schema.songs.resource_id,
      title: schema.songs.title,
      artistName: schema.artists.name,
      similarity: sql<number>`similarity(${title}, ${read})`,
    })
    .from(schema.songs)
    .innerJoin(schema.artists, eq(schema.songs.artistId, schema.artists.id))
    .where(
      and(
        eq(schema.songs.artistId, artistId),
        sql`(${title} % ${read} OR lower(${schema.songs.title}) = lower(${normalizedTitle}) OR lower(${title}) = lower(${read}))`,
      ),
    )
    .orderBy(sql`similarity(${title}, ${read}) DESC`)
    .limit(5);

  return selectDuplicateMatches(candidates, normalizedTitle);
}

export { searchSongs, findExistingSong, songWith };
export type { Song, FeaturedArtist, ExistingSongMatch, DuplicateCheckResult };
