import { eq, countDistinct } from "drizzle-orm";
import { schema } from "@song-lists/db";
import {
  toArtistDetails,
  type ArtistDetails,
} from "@/lib/artists/artist-details";
import { db } from "./client";

const relatedSongWith = {
  columns: { id: true, title: true },
  with: { artist: { columns: { id: true, name: true } } },
} as const;

/** One artist with their songs, or `null` when no artist has that id. */
async function getArtistDetails(
  artistId: number,
): Promise<ArtistDetails | null> {
  const [row, lists] = await Promise.all([
    db.query.artists.findFirst({
      where: eq(schema.artists.id, artistId),
      columns: { id: true, name: true, createdAt: true },
      with: {
        songs: {
          columns: { id: true, title: true },
          with: {
            coverOf: {
              columns: { id: true },
              with: { original: relatedSongWith },
            },
          },
        },
        featuredOnSongs: {
          columns: { id: true },
          with: { song: relatedSongWith },
        },
      },
    }),
    db
      .select({
        id: schema.lists.id,
        name: schema.lists.name,
        songCount: countDistinct(schema.songs.id),
      })
      .from(schema.songs)
      .innerJoin(schema.listSongs, eq(schema.listSongs.songId, schema.songs.id))
      .innerJoin(schema.lists, eq(schema.lists.id, schema.listSongs.listId))
      .where(eq(schema.songs.artistId, artistId))
      .groupBy(schema.lists.id, schema.lists.name),
  ]);

  return row ? toArtistDetails(row, lists) : null;
}

export { getArtistDetails };
