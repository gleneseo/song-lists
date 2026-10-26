import { asc, eq } from "drizzle-orm";
import { SONG_METADATA_STATUS, schema } from "@song-lists/db";
import type { CreatableOption } from "@/components/add-song/creatable-autocomplete";
import type { SongDetailsInput } from "@/lib/songs/song-details-input";
import { db } from "./client";
import { getLists, type ListOption } from "./lists";
import { getProductionTypes, type ProductionTypeOption } from "./productions";
import { getAllAdvocateOptions, type UserOption } from "./users";

/** Everything the edit form needs: the song's current values plus the choices it can pick from. */
interface SongEditData {
  songId: number;
  title: string;
  bio: string;
  artist: CreatableOption;
  featuredArtists: CreatableOption[];
  /** The productions the song is linked to now, each of which can be kept or dropped. */
  productions: CreatableOption[];
  /** The songs this one covers now, each of which can be kept or dropped. */
  covers: CreatableOption[];
  listIds: number[];
  advocateIds: string[];
  /** The album details the song shows now, or `null` when it has none. */
  details: SongDetailsInput | null;
  lists: ListOption[];
  advocateOptions: UserOption[];
  productionTypes: ProductionTypeOption[];
}

/** The current values and available choices for editing one song, or `null` when it doesn't exist. */
async function getSongEditData(songId: number): Promise<SongEditData | null> {
  const [row, lists, advocateOptions, productionTypes] = await Promise.all([
    db.query.songs.findFirst({
      where: eq(schema.songs.id, songId),
      columns: { id: true, title: true, bio: true, artistId: true },
      with: {
        artist: { columns: { id: true, name: true } },
        featuredArtists: {
          columns: { id: true },
          with: { artist: { columns: { id: true, name: true } } },
        },
        productions: {
          columns: { id: true },
          with: {
            production: {
              columns: { id: true, name: true, releaseYear: true },
            },
          },
        },
        coverOf: {
          columns: { id: true },
          with: {
            original: {
              columns: { id: true, title: true },
              with: { artist: { columns: { name: true } } },
            },
          },
        },
        lists: { columns: { listId: true } },
        advocates: { columns: { userId: true } },
        metadata: {
          columns: {
            status: true,
            source: true,
            sourceTrackId: true,
            artworkUrl: true,
            albumName: true,
            releaseYear: true,
          },
        },
      },
    }),
    getLists(),
    getAllAdvocateOptions(),
    getProductionTypes(),
  ]);

  if (!row) {
    return null;
  }

  return {
    songId: row.id,
    title: row.title,
    bio: row.bio ?? "",
    artist: { id: row.artist.id, label: row.artist.name },
    featuredArtists: row.featuredArtists.map(({ artist }) => ({
      id: artist.id,
      label: artist.name,
    })),
    productions: row.productions.map(({ production }) => ({
      id: production.id,
      label: `${production.name} (${production.releaseYear})`,
    })),
    covers: row.coverOf.map(({ original }) => ({
      id: original.id,
      label: `${original.title} — ${original.artist.name}`,
    })),
    listIds: row.lists.map((entry) => entry.listId),
    advocateIds: row.advocates.map((entry) => entry.userId),
    details:
      row.metadata?.status === SONG_METADATA_STATUS.MATCHED
        ? {
            albumName: row.metadata.albumName ?? "",
            releaseYear:
              row.metadata.releaseYear === null
                ? ""
                : String(row.metadata.releaseYear),
            artworkUrl: row.metadata.artworkUrl ?? "",
            source: row.metadata.source,
            sourceTrackId: row.metadata.sourceTrackId,
          }
        : null,
    lists,
    advocateOptions,
    productionTypes,
  };
}

/** The IDs and rows currently linked to a song, for diffing against an edit. */
async function getSongLinks(tx: Pick<typeof db, "select">, songId: number) {
  const [featured, productions, covers, lists, advocates] = await Promise.all([
    tx
      .select({
        id: schema.songFeaturedArtists.id,
        target: schema.songFeaturedArtists.artistId,
      })
      .from(schema.songFeaturedArtists)
      .where(eq(schema.songFeaturedArtists.songId, songId)),
    tx
      .select({
        id: schema.songProductions.id,
        target: schema.songProductions.productionId,
      })
      .from(schema.songProductions)
      .where(eq(schema.songProductions.songId, songId)),
    tx
      .select({
        id: schema.songCovers.id,
        target: schema.songCovers.originalSongId,
      })
      .from(schema.songCovers)
      .where(eq(schema.songCovers.songId, songId)),
    tx
      .select({ id: schema.listSongs.id, target: schema.listSongs.listId })
      .from(schema.listSongs)
      .where(eq(schema.listSongs.songId, songId))
      .orderBy(asc(schema.listSongs.id)),
    tx
      .select({
        id: schema.songAdvocates.id,
        target: schema.songAdvocates.userId,
      })
      .from(schema.songAdvocates)
      .where(eq(schema.songAdvocates.songId, songId)),
  ]);

  return { featured, productions, covers, lists, advocates };
}

export { getSongEditData, getSongLinks };
export type { SongEditData };
