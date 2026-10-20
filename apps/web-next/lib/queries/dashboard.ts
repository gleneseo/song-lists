import { asc, count, countDistinct, desc, eq, ne, sql } from "drizzle-orm";
import { cache } from "react";
import { schema, SYSTEM_USER_ID } from "@song-lists/db";
import type { YearCount } from "@/lib/dashboard/activity-by-year";
import type { Contributor } from "@/lib/dashboard/build-leaderboard";
import { songOfTheDayIndex } from "@/lib/dashboard/song-of-the-day";
import { db } from "./client";
import { sortKeySql } from "./sort-key";
import { songWith, type Song } from "./songs";
import { decodeTimestamp } from "./timestamps";

interface ListReference {
  id: number;
  name: string;
}

interface HistoryEntry {
  addedAt: Date;
  song: Song;
  lists: ListReference[];
}

interface UserStats {
  songsAdded: number;
  /** Distinct artists across the songs this user added. */
  artistsCovered: number;
  /** How many times this user put a song onto a list. */
  listAdditions: number;
  /** Distinct lists this user has added at least one song to. */
  listsContributedTo: number;
  firstAddedAt: Date | null;
  lastAddedAt: Date | null;
  catalogSongs: number;
}

interface TopArtist {
  id: number;
  name: string;
  songCount: number;
}

interface CatalogAddition {
  addedAt: Date;
  song: Song;
}

interface FeaturedSong {
  song: Song;
  lists: ListReference[];
  advocates: string[];
}

/**
 * A user's "added" songs are the ones they advocate. That covers both ways a
 * song gets a person's name on it: the seeded catalog records who put each
 * song forward as an advocate, and the Add Song page always makes its
 * creator an advocate.
 */
const advocatedBy = (userId: string) => eq(schema.songAdvocates.userId, userId);

/** The user's most recently added songs, newest first. */
async function getUserHistory(
  userId: string,
  limit: number,
): Promise<HistoryEntry[]> {
  const rows = await db.query.songAdvocates.findMany({
    columns: { createdAt: true },
    where: advocatedBy(userId),
    orderBy: [
      desc(schema.songAdvocates.createdAt),
      desc(schema.songAdvocates.id),
    ],
    limit,
    with: {
      song: {
        columns: { id: true, title: true },
        with: {
          ...songWith,
          lists: {
            columns: { id: true },
            with: { list: { columns: { id: true, name: true } } },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    addedAt: row.createdAt,
    song: row.song,
    lists: row.song.lists.map((entry) => entry.list),
  }));
}

async function fetchUserStats(userId: string): Promise<UserStats> {
  const [[added], [listed], [catalog]] = await Promise.all([
    db
      .select({
        songsAdded: count(schema.songAdvocates.id),
        artistsCovered: countDistinct(schema.songs.artistId),
        firstAddedAt: sql<
          string | null
        >`min(${schema.songAdvocates.createdAt})`,
        lastAddedAt: sql<string | null>`max(${schema.songAdvocates.createdAt})`,
      })
      .from(schema.songAdvocates)
      .innerJoin(schema.songs, eq(schema.songs.id, schema.songAdvocates.songId))
      .where(advocatedBy(userId)),
    db
      .select({
        listAdditions: count(schema.listSongs.id),
        listsContributedTo: countDistinct(schema.listSongs.listId),
      })
      .from(schema.listSongs)
      .where(eq(schema.listSongs.createdBy, userId)),
    db.select({ catalogSongs: count(schema.songs.id) }).from(schema.songs),
  ]);

  return {
    songsAdded: added?.songsAdded ?? 0,
    artistsCovered: added?.artistsCovered ?? 0,
    firstAddedAt: decodeTimestamp(added?.firstAddedAt ?? null),
    lastAddedAt: decodeTimestamp(added?.lastAddedAt ?? null),
    listAdditions: listed?.listAdditions ?? 0,
    listsContributedTo: listed?.listsContributedTo ?? 0,
    catalogSongs: catalog?.catalogSongs ?? 0,
  };
}

/** How many songs the user added in each calendar year they were active. */
async function getUserYearlyActivity(userId: string): Promise<YearCount[]> {
  const year = sql<number>`extract(year from ${schema.songAdvocates.createdAt})`;

  return db
    .select({
      year: year.mapWith(Number),
      count: count(schema.songAdvocates.id),
    })
    .from(schema.songAdvocates)
    .where(advocatedBy(userId))
    .groupBy(year);
}

/** The artists the user has added the most songs by. */
async function getUserTopArtists(
  userId: string,
  limit: number,
): Promise<TopArtist[]> {
  const songCount = count(schema.songAdvocates.id);

  return db
    .select({
      id: schema.artists.id,
      name: schema.artists.name,
      songCount,
    })
    .from(schema.songAdvocates)
    .innerJoin(schema.songs, eq(schema.songs.id, schema.songAdvocates.songId))
    .innerJoin(schema.artists, eq(schema.artists.id, schema.songs.artistId))
    .where(advocatedBy(userId))
    .groupBy(schema.artists.id, schema.artists.name)
    .orderBy(desc(songCount), sortKeySql(schema.artists.name))
    .limit(limit);
}

/** Everyone who has added songs, with how many -- the System user excluded. */
async function fetchContributors(): Promise<Contributor[]> {
  return db
    .select({
      userId: schema.users.id,
      name: schema.users.name,
      count: count(schema.songAdvocates.id),
    })
    .from(schema.songAdvocates)
    .innerJoin(schema.users, eq(schema.users.id, schema.songAdvocates.userId))
    .where(ne(schema.users.id, SYSTEM_USER_ID))
    .groupBy(schema.users.id, schema.users.name);
}

/** The newest songs in the whole catalog, whoever added them. */
async function getCatalogAdditions(limit: number): Promise<CatalogAddition[]> {
  const rows = await db.query.songs.findMany({
    columns: { id: true, title: true, createdAt: true },
    orderBy: [desc(schema.songs.createdAt), desc(schema.songs.id)],
    limit,
    with: songWith,
  });

  return rows.map((row) => ({ addedAt: row.createdAt, song: row }));
}

/**
 * Today's featured catalog song -- the same for everyone for the whole UTC
 * day -- or `null` when the catalog is empty.
 */
async function getSongOfTheDay(now: Date): Promise<FeaturedSong | null> {
  const [totals] = await db
    .select({ total: count(schema.songs.id) })
    .from(schema.songs);
  const index = songOfTheDayIndex(totals?.total ?? 0, now);

  if (index === null) {
    return null;
  }

  const song = await db.query.songs.findFirst({
    columns: { id: true, title: true },
    orderBy: [asc(schema.songs.id)],
    offset: index,
    with: {
      ...songWith,
      lists: {
        columns: { id: true },
        with: { list: { columns: { id: true, name: true } } },
      },
      advocates: {
        columns: { id: true },
        with: { advocate: { columns: { name: true } } },
      },
    },
  });

  if (!song) {
    return null;
  }

  return {
    song,
    lists: song.lists.map((entry) => entry.list),
    advocates: song.advocates.map((entry) => entry.advocate.name),
  };
}

/**
 * Several dashboard sections need the same figures, so memoize these two per
 * request -- React's `cache` makes concurrent callers share one query.
 */
const getUserStats = cache(fetchUserStats);
const getContributors = cache(fetchContributors);

export {
  getCatalogAdditions,
  getContributors,
  getSongOfTheDay,
  getUserHistory,
  getUserStats,
  getUserTopArtists,
  getUserYearlyActivity,
};
export type {
  CatalogAddition,
  FeaturedSong,
  HistoryEntry,
  ListReference,
  TopArtist,
  UserStats,
};
