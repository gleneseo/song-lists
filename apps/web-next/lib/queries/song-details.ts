import { eq } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { toSongDetails, type SongDetails } from "@/lib/songs/song-details";
import { db } from "./client";

const relatedSongWith = {
  columns: { id: true, title: true },
  with: { artist: { columns: { id: true, name: true } } },
} as const;

/** One song with everything attached to it, or `null` when no song has that id. */
async function getSongDetails(songId: number): Promise<SongDetails | null> {
  const row = await db.query.songs.findFirst({
    where: eq(schema.songs.id, songId),
    columns: { id: true, title: true, bio: true, createdAt: true },
    with: {
      artist: { columns: { id: true, name: true } },
      featuredArtists: {
        columns: { id: true },
        with: { artist: { columns: { id: true, name: true } } },
      },
      coverOf: { columns: { id: true }, with: { original: relatedSongWith } },
      coveredBy: { columns: { id: true }, with: { song: relatedSongWith } },
      productions: {
        columns: { id: true },
        with: {
          production: {
            columns: { id: true, name: true, releaseYear: true },
            with: { type: { columns: { name: true } } },
          },
        },
      },
      advocates: {
        columns: { createdAt: true },
        with: { advocate: { columns: { name: true } } },
      },
      lists: {
        columns: { createdAt: true },
        with: {
          list: { columns: { id: true, name: true } },
          creator: { columns: { name: true } },
        },
      },
    },
  });

  return row ? toSongDetails(row) : null;
}

export { getSongDetails };
