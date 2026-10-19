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
import type { ListView } from "@/lib/lists/list-view";
import { escapeLike } from "@/lib/text/escape-like";
import { db } from "./client";
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
}

interface ListEntry {
  id: number;
  addedAt: Date;
  addedBy: string;
  song: Song;
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
      songCount: count(schema.listSongs.id),
    })
    .from(schema.lists)
    .leftJoin(schema.listSongs, eq(schema.listSongs.listId, schema.lists.id))
    .where(eq(schema.lists.id, listId))
    .groupBy(schema.lists.id, schema.lists.name, schema.lists.createdAt);

  return row ?? null;
}

/** Narrows a list to songs whose title or artist contains `query`, ignoring case. */
function matchesQuery(query: string) {
  if (!query) {
    return undefined;
  }

  const pattern = `%${escapeLike(query)}%`;

  return or(
    ilike(schema.songs.title, pattern),
    ilike(schema.artists.name, pattern),
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
        directed(sql`lower(${schema.songs.title})`),
        asc(schema.listSongs.id),
      ];
    case "artist":
      return [
        directed(sql`lower(${schema.artists.name})`),
        asc(sql`lower(${schema.songs.title})`),
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
): Promise<number> {
  const [row] = await db
    .select({ total: count(schema.listSongs.id) })
    .from(schema.listSongs)
    .innerJoin(schema.songs, eq(schema.songs.id, schema.listSongs.songId))
    .innerJoin(schema.artists, eq(schema.artists.id, schema.songs.artistId))
    .where(and(eq(schema.listSongs.listId, listId), matchesQuery(query)));

  return row?.total ?? 0;
}

/**
 * One page of a list's songs, narrowed by the view's search and sorted by
 * its column. Two steps: pick the page's entries (the search and sort need
 * the artist joined in), then load those songs with their full details.
 */
async function getListEntries(
  listId: number,
  view: Pick<ListView, "query" | "sort" | "direction">,
  offset: number,
  limit: number,
): Promise<ListEntry[]> {
  const page = await db
    .select({
      id: schema.listSongs.id,
      songId: schema.songs.id,
      addedAt: schema.listSongs.createdAt,
      addedBy: schema.users.name,
    })
    .from(schema.listSongs)
    .innerJoin(schema.songs, eq(schema.songs.id, schema.listSongs.songId))
    .innerJoin(schema.artists, eq(schema.artists.id, schema.songs.artistId))
    .innerJoin(schema.users, eq(schema.users.id, schema.listSongs.createdBy))
    .where(and(eq(schema.listSongs.listId, listId), matchesQuery(view.query)))
    .orderBy(...orderEntries(view))
    .offset(offset)
    .limit(limit);

  if (page.length === 0) {
    return [];
  }

  const songs = await db.query.songs.findMany({
    columns: { id: true, title: true },
    where: inArray(
      schema.songs.id,
      page.map((entry) => entry.songId),
    ),
    with: songWith,
  });
  const songsById = new Map(songs.map((song) => [song.id, song]));

  return page.flatMap(({ id, songId, addedAt, addedBy }) => {
    const song = songsById.get(songId);

    return song ? [{ id, addedAt, addedBy, song }] : [];
  });
}

export {
  countListEntries,
  getLists,
  getListsOverview,
  getListSummary,
  getListEntries,
};
export type { ListEntry, ListOption, ListOverview, ListSummary };
