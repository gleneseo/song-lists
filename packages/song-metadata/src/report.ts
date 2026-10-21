import { type Database, schema } from "@song-lists/db";
import { asc, eq } from "drizzle-orm";

/** One song and what is known about it from lookups; the details are `null` if it was never looked up or nothing was found. */
interface SongMetadataReportRow {
  songId: number;
  artistName: string;
  title: string;
  status: string | null;
  albumName: string | null;
  releaseYear: number | null;
  sourceTrackId: string | null;
  artworkUrl: string | null;
  fetchedAt: Date | null;
}

/** Every song in the catalog with the outcome of its lookup, in the order they were added. */
async function listSongMetadataReport(
  db: Database,
): Promise<SongMetadataReportRow[]> {
  return db
    .select({
      songId: schema.songs.id,
      artistName: schema.artists.name,
      title: schema.songs.title,
      status: schema.songMetadata.status,
      albumName: schema.songMetadata.albumName,
      releaseYear: schema.songMetadata.releaseYear,
      sourceTrackId: schema.songMetadata.sourceTrackId,
      artworkUrl: schema.songMetadata.artworkUrl,
      fetchedAt: schema.songMetadata.fetchedAt,
    })
    .from(schema.songs)
    .innerJoin(schema.artists, eq(schema.artists.id, schema.songs.artistId))
    .leftJoin(
      schema.songMetadata,
      eq(schema.songMetadata.songId, schema.songs.id),
    )
    .orderBy(asc(schema.songs.id));
}

export { listSongMetadataReport };
export type { SongMetadataReportRow };
