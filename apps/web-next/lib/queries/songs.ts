import { and, asc, eq, sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { db } from "./client";

interface Song {
  id: number;
  title: string;
  artist: { name: string };
  featuredArtists: { artist: { name: string } }[];
  coverOf: { original: { title: string; artist: { name: string } } }[];
}

/**
 * Shared `with` shape for every query that returns a full {@link Song} --
 * kept as one constant so the two queries below can't drift apart.
 */
const songWith = {
  artist: { columns: { name: true } },
  featuredArtists: {
    columns: { id: true },
    with: { artist: { columns: { name: true } } },
  },
  coverOf: {
    columns: { id: true },
    with: {
      original: {
        columns: { title: true },
        with: { artist: { columns: { name: true } } },
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

/** Below this, two titles are treated as coincidentally similar, not the same song. */
const NEAR_DUPLICATE_SIMILARITY_THRESHOLD = 0.5;

async function getSongs(): Promise<Song[]> {
  return db.query.songs.findMany({
    columns: { id: true, title: true },
    with: songWith,
    orderBy: [asc(schema.songs.title)],
  });
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

  return db.query.songs.findMany({
    columns: { id: true, title: true },
    with: songWith,
    where: sql`(${schema.songs.title} % ${trimmed} OR ${schema.songs.title} ILIKE ${`%${trimmed}%`})`,
    orderBy: [sql`similarity(${schema.songs.title}, ${trimmed}) DESC`],
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
  const candidates = await db
    .select({
      id: schema.songs.id,
      resourceId: schema.songs.resource_id,
      title: schema.songs.title,
      artistName: schema.artists.name,
      similarity: sql<number>`similarity(${schema.songs.title}, ${normalizedTitle})`,
    })
    .from(schema.songs)
    .innerJoin(schema.artists, eq(schema.songs.artistId, schema.artists.id))
    .where(
      and(
        eq(schema.songs.artistId, artistId),
        sql`(${schema.songs.title} % ${normalizedTitle} OR lower(${schema.songs.title}) = lower(${normalizedTitle}))`,
      ),
    )
    .orderBy(sql`similarity(${schema.songs.title}, ${normalizedTitle}) DESC`)
    .limit(5);

  const exact =
    candidates.find(
      (candidate) =>
        candidate.title.toLowerCase() === normalizedTitle.toLowerCase(),
    ) ?? null;

  const near =
    candidates.find(
      (candidate) =>
        candidate !== exact &&
        candidate.similarity >= NEAR_DUPLICATE_SIMILARITY_THRESHOLD,
    ) ?? null;

  return { exact, near };
}

export { getSongs, searchSongs, findExistingSong };
export type { Song, ExistingSongMatch, DuplicateCheckResult };
