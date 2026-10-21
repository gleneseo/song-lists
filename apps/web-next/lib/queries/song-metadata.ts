import {
  SONG_METADATA_MATCHED_BY,
  SONG_METADATA_STATUS,
  SYSTEM_USER_ID,
  schema,
} from "@song-lists/db";
import { createItunesLookup } from "@song-lists/song-metadata";
import { eq } from "drizzle-orm";
import { db } from "./client";

declare global {
  var songListsLookup: ReturnType<typeof createItunesLookup> | undefined;
}

// Shared so every lookup counts against the same request allowance; cached on
// `global` for the same reason the database client is (see ./client).
const lookUpSong = global.songListsLookup ?? createItunesLookup();
global.songListsLookup = lookUpSong;

const NO_DETAILS = {
  source: null,
  sourceTrackId: null,
  artworkUrl: null,
  albumName: null,
  releaseYear: null,
} as const;

/**
 * Looks a song up on iTunes and saves what turned up (or that nothing did)
 * beside it, so its art and album can be shown without asking again.
 *
 * It is meant to run after a song is saved, and it never throws: a lookup
 * that fails is logged and the song simply has no details yet. A row that a
 * person chose by hand is never replaced by a later automatic lookup, and a
 * lookup that errored never replaces details already found.
 *
 * Setting `SONG_METADATA_LOOKUP=off` turns lookups off, which is how the
 * browser tests keep from calling out to iTunes.
 */
async function recordSongMetadata(songId: number): Promise<void> {
  if (process.env["SONG_METADATA_LOOKUP"] === "off") {
    return;
  }

  try {
    const song = await db.query.songs.findFirst({
      where: eq(schema.songs.id, songId),
      columns: { title: true },
      with: { artist: { columns: { name: true } } },
    });

    if (!song) {
      return;
    }

    const result = await lookUpSong({
      title: song.title,
      artistName: song.artist.name,
    });
    const details =
      result.status === SONG_METADATA_STATUS.MATCHED
        ? {
            source: result.source,
            sourceTrackId: result.sourceTrackId,
            artworkUrl: result.artworkUrl,
            albumName: result.albumName,
            releaseYear: result.releaseYear,
          }
        : NO_DETAILS;
    const now = new Date();
    const insert = db.insert(schema.songMetadata).values({
      songId,
      status: result.status,
      ...details,
      matchedBy: SONG_METADATA_MATCHED_BY.AUTO,
      fetchedAt: now,
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    if (result.status === SONG_METADATA_STATUS.ERROR) {
      console.error(
        `Looking up song ${String(songId)} failed: ${result.message}`,
      );
      await insert.onConflictDoNothing({ target: schema.songMetadata.songId });

      return;
    }

    await insert.onConflictDoUpdate({
      target: schema.songMetadata.songId,
      set: {
        status: result.status,
        ...details,
        fetchedAt: now,
        updatedAt: now,
        updatedBy: SYSTEM_USER_ID,
      },
      setWhere: eq(
        schema.songMetadata.matchedBy,
        SONG_METADATA_MATCHED_BY.AUTO,
      ),
    });
  } catch (error) {
    console.error(`Saving details for song ${String(songId)} failed:`, error);
  }
}

export { recordSongMetadata };
