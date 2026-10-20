import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { schema } from "@song-lists/db";
import type { ListExtraColumn } from "@song-lists/db/list-extra-column";
import { parseExtraColumns, showsProductions } from "@/lib/lists/extra-columns";
import type { ListView } from "@/lib/lists/list-view";
import { escapeLike } from "@/lib/text/escape-like";
import { readSymbols } from "@/lib/text/read-symbols";
import { db } from "./client";
import { readSymbolsSql, sortKeySql } from "./sort-key";
import { songWith, type Song } from "./songs";
import { decodeTimestamp } from "./timestamps";

interface ListOption {
  id: number;
  name: string;
}

interface ListOverview extends ListOption {
  songCount: number;
  /** How many of the list's songs this user added to it. */
  yourSongCount: number;
  /** When a song was most recently added to the list, or `null` while it's empty. */
  lastAddedAt: Date | null;
}

interface ListSummary extends ListOption {
  createdAt: Date;
  songCount: number;
  /** The optional columns this list's page shows beyond the standard ones. */
  extraColumns: ListExtraColumn[];
}

interface EntryProduction {
  id: number;
  name: string;
  releaseYear: number;
}

interface ListEntry {
  id: number;
  addedAt: Date;
  /** The song's advocates, comma separated; empty when it has none. */
  addedBy: string;
  song: Song;
  /** The song's film/TV productions; only loaded for lists that show them, otherwise empty. */
  productions: EntryProduction[];
}

async function getLists(): Promise<ListOption[]> {
  return db.query.lists.findMany({
    columns: { id: true, name: true },
    orderBy: [asc(schema.lists.id)],
  });
}

/** Every list with its size and how much of it `userId` contributed. */
async function getListsOverview(userId: string): Promise<ListOverview[]> {
  return db
    .select({
      id: schema.lists.id,
      name: schema.lists.name,
      songCount: count(schema.listSongs.id),
      yourSongCount:
        sql<number>`count(*) filter (where ${schema.listSongs.createdBy} = ${userId})`.mapWith(
          Number,
        ),
      lastAddedAt: sql<Date | null>`max(${schema.listSongs.createdAt})`.mapWith(
        decodeTimestamp,
      ),
    })
    .from(schema.lists)
    .leftJoin(schema.listSongs, eq(schema.listSongs.listId, schema.lists.id))
    .groupBy(schema.lists.id, schema.lists.name)
    .orderBy(asc(schema.lists.id));
}

/** A single list's header details, or `null` when no list has that id. */
async function getListSummary(listId: number): Promise<ListSummary | null> {
  const [row] = await db
    .select({
      id: schema.lists.id,
      name: schema.lists.name,
      createdAt: schema.lists.createdAt,
      extraColumns: schema.lists.extraColumns,
      songCount: count(schema.listSongs.id),
    })
    .from(schema.lists)
    .leftJoin(schema.listSongs, eq(schema.listSongs.listId, schema.lists.id))
    .where(eq(schema.lists.id, listId))
    .groupBy(
      schema.lists.id,
      schema.lists.name,
      schema.lists.createdAt,
      schema.lists.extraColumns,
    );

  return row
    ? { ...row, extraColumns: parseExtraColumns(row.extraColumns) }
    : null;
}

/** The names of the productions a song appears in, as a subquery filtered to `pattern`. */
function songHasProductionMatching(pattern: string) {
  return sql`exists (
    select 1 from ${schema.songProductions}
    inner join ${schema.productions}
      on ${schema.productions.id} = ${schema.songProductions.productionId}
    where ${schema.songProductions.songId} = ${schema.songs.id}
      and ${readSymbolsSql(schema.productions.name)} ilike ${pattern}
  )`;
}

/** The alphabetically first production a song appears in, for sorting; null when it has none. */
const firstProductionName = sql`(
  select min(${sortKeySql(schema.productions.name)}) from ${schema.songProductions}
  inner join ${schema.productions}
    on ${schema.productions.id} = ${schema.songProductions.productionId}
  where ${schema.songProductions.songId} = ${schema.songs.id}
)`;

/**
 * The names of a song's advocates, alphabetical and comma separated -- the
 * "Added by" column, and its sort key -- or null when it has none.
 */
const advocateNames = sql<string | null>`(
  select string_agg(${schema.users.name}, ', ' order by lower(${schema.users.name}), ${schema.users.id})
  from ${schema.songAdvocates}
  inner join ${schema.users} on ${schema.users.id} = ${schema.songAdvocates.userId}
  where ${schema.songAdvocates.songId} = ${schema.songs.id}
)`;

/**
 * Narrows a list to songs whose title or artist contains `query`, ignoring
 * case -- and, on a list that shows Productions, whose production does too.
 */
function matchesQuery(query: string, extraColumns: ListExtraColumn[]) {
  if (!query) {
    return undefined;
  }

  // Matched with "$" and "!" read as letters on both sides, so "short" finds
  // "Too $hort" and "too $hort" does too.
  const pattern = `%${escapeLike(readSymbols(query))}%`;

  return or(
    ilike(readSymbolsSql(schema.songs.title), pattern),
    ilike(readSymbolsSql(schema.artists.name), pattern),
    showsProductions(extraColumns)
      ? songHasProductionMatching(pattern)
      : undefined,
  );
}

/** The ORDER BY for a sortable column; ties always fall back to a stable order. */
function orderEntries({
  sort,
  direction,
}: Pick<ListView, "sort" | "direction">) {
  const directed = direction === "asc" ? asc : desc;

  switch (sort) {
    case "title":
      return [
        directed(sortKeySql(schema.songs.title)),
        asc(schema.listSongs.id),
      ];
    case "artist":
      return [
        directed(sortKeySql(schema.artists.name)),
        asc(sortKeySql(schema.songs.title)),
        asc(schema.listSongs.id),
      ];
    case "production":
      // Songs without a production sort last whichever way it's going.
      return [
        sql`${firstProductionName} ${direction === "asc" ? sql`asc` : sql`desc`} nulls last`,
        asc(sortKeySql(schema.songs.title)),
        asc(schema.listSongs.id),
      ];
    case "addedBy":
      // Songs without an advocate sort last whichever way it's going.
      return [
        sql`lower(${advocateNames}) ${direction === "asc" ? sql`asc` : sql`desc`} nulls last`,
        asc(sortKeySql(schema.songs.title)),
        asc(schema.listSongs.id),
      ];
    case "added":
      return [
        directed(schema.listSongs.createdAt),
        directed(schema.listSongs.id),
      ];
  }
}

/** How many of a list's songs match `query` -- all of them when it's empty. */
async function countListEntries(
  listId: number,
  query: string,
  extraColumns: ListExtraColumn[],
): Promise<number> {
  const [row] = await db
    .select({ total: count(schema.listSongs.id) })
    .from(schema.listSongs)
    .innerJoin(schema.songs, eq(schema.songs.id, schema.listSongs.songId))
    .innerJoin(schema.artists, eq(schema.artists.id, schema.songs.artistId))
    .where(
      and(
        eq(schema.listSongs.listId, listId),
        matchesQuery(query, extraColumns),
      ),
    );

  return row?.total ?? 0;
}

/** Each song's productions, earliest first, for just the songs given. */
async function getProductionsBySong(
  songIds: number[],
): Promise<Map<number, EntryProduction[]>> {
  const rows = await db
    .select({
      songId: schema.songProductions.songId,
      id: schema.productions.id,
      name: schema.productions.name,
      releaseYear: schema.productions.releaseYear,
    })
    .from(schema.songProductions)
    .innerJoin(
      schema.productions,
      eq(schema.productions.id, schema.songProductions.productionId),
    )
    .where(inArray(schema.songProductions.songId, songIds))
    .orderBy(asc(schema.productions.releaseYear), asc(schema.productions.name));

  const bySong = new Map<number, EntryProduction[]>();

  for (const { songId, ...production } of rows) {
    bySong.set(songId, [...(bySong.get(songId) ?? []), production]);
  }

  return bySong;
}

/**
 * One page of a list's songs, narrowed by the view's search and sorted by
 * its column. Two steps: pick the page's entries (the search and sort need
 * the artist joined in), then load those songs with their full details. The
 * productions are only loaded for a list that shows them.
 */
async function getListEntries(
  listId: number,
  view: Pick<ListView, "query" | "sort" | "direction">,
  extraColumns: ListExtraColumn[],
  offset: number,
  limit: number,
): Promise<ListEntry[]> {
  const page = await db
    .select({
      id: schema.listSongs.id,
      songId: schema.songs.id,
      addedAt: schema.listSongs.createdAt,
      addedBy: advocateNames,
    })
    .from(schema.listSongs)
    .innerJoin(schema.songs, eq(schema.songs.id, schema.listSongs.songId))
    .innerJoin(schema.artists, eq(schema.artists.id, schema.songs.artistId))
    .where(
      and(
        eq(schema.listSongs.listId, listId),
        matchesQuery(view.query, extraColumns),
      ),
    )
    .orderBy(...orderEntries(view))
    .offset(offset)
    .limit(limit);

  if (page.length === 0) {
    return [];
  }

  const songIds = page.map((entry) => entry.songId);
  const [songs, productionsBySong] = await Promise.all([
    db.query.songs.findMany({
      columns: { id: true, title: true },
      where: inArray(schema.songs.id, songIds),
      with: songWith,
    }),
    showsProductions(extraColumns)
      ? getProductionsBySong(songIds)
      : new Map<number, EntryProduction[]>(),
  ]);
  const songsById = new Map(songs.map((song) => [song.id, song]));

  return page.flatMap(({ id, songId, addedAt, addedBy }) => {
    const song = songsById.get(songId);

    return song
      ? [
          {
            id,
            addedAt,
            addedBy: addedBy ?? "",
            song,
            productions: productionsBySong.get(songId) ?? [],
          },
        ]
      : [];
  });
}

export {
  countListEntries,
  getLists,
  getListsOverview,
  getListSummary,
  getListEntries,
};
export type {
  EntryProduction,
  ListEntry,
  ListOption,
  ListOverview,
  ListSummary,
};
