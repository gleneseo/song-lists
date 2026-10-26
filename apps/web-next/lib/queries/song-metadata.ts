import {
  SONG_METADATA_MATCHED_BY,
  SONG_METADATA_SOURCE,
  SONG_METADATA_STATUS,
  schema,
} from "@song-lists/db";
import {
  createSongLookup,
  recordSongMetadata as lookUpAndRecord,
  type SongLookupResult,
  type WantedSong,
} from "@song-lists/song-metadata";
import type { CleanSongDetails } from "@/lib/songs/song-details-input";
import { db } from "./client";

declare global {
  var songListsLookup: ReturnType<typeof createSongLookup> | undefined;
}

// Shared so every lookup counts against the same request allowance; cached on
// `global` for the same reason the database client is (see ./client).
const lookup = global.songListsLookup ?? createSongLookup();
global.songListsLookup = lookup;

/**
 * Looks a song up on iTunes and MusicBrainz and saves what turned up (or that nothing did)
 * beside it, so its art and album can be shown without asking again.
 *
 * It is meant to run after a song is saved, and it never throws: a lookup
 * that fails is logged and the song simply has no details yet. (What a lookup
 * replaces, and what it leaves alone, is decided where it's saved; see
 * `recordSongMetadata` in the song-metadata package.)
 *
 * Setting `SONG_METADATA_LOOKUP=off` turns lookups off, which is how the
 * browser tests keep from calling out to them.
 */
async function recordSongMetadata(songId: number): Promise<void> {
  if (process.env["SONG_METADATA_LOOKUP"] === "off") {
    return;
  }

  const outcome = await lookUpAndRecord({ db, lookup }, songId);

  if (outcome.status === SONG_METADATA_STATUS.ERROR) {
    console.error(
      `Looking up song ${String(songId)} failed: ${outcome.message}`,
    );
  }
}

/** How long the stand-in lookup takes to answer. */
const STUB_LOOKUP_MS = 800;

/**
 * What the lookup finds for a song right now, to show an admin before
 * anything is saved. It asks the same services, through the same shared
 * request allowance, as the lookup that runs when a song is added.
 *
 * Setting `SONG_METADATA_PREVIEW=stub` answers from a fixed stand-in instead,
 * which is how the browser tests try it without calling out: any song is
 * found on "Stub Album for <title>", except a title containing "Nothing Found"
 * (not found) or "Lookup Failure" (the service failed). The stand-in takes a
 * moment, as a real lookup does, so a test can see the form wait for it.
 */
async function lookUpSongDetails(
  wanted: WantedSong,
): Promise<SongLookupResult> {
  if (process.env["SONG_METADATA_PREVIEW"] !== "stub") {
    return lookup(wanted);
  }

  await new Promise((resolve) => setTimeout(resolve, STUB_LOOKUP_MS));

  if (wanted.title.includes("Nothing Found")) {
    return { status: SONG_METADATA_STATUS.NOT_FOUND };
  }

  if (wanted.title.includes("Lookup Failure")) {
    return {
      status: SONG_METADATA_STATUS.ERROR,
      message: "The stand-in service failed.",
    };
  }

  return {
    status: SONG_METADATA_STATUS.MATCHED,
    source: SONG_METADATA_SOURCE.ITUNES,
    sourceTrackId: "stub-track",
    artworkUrl: "https://example.test/stub/100x100bb.jpg",
    albumName: `Stub Album for ${wanted.title}`,
    releaseYear: 1999,
    isAlbum: true,
  };
}

/**
 * Saves the album details an admin settled on for a song, as chosen by hand:
 * an automatic lookup never replaces them. Replaces whatever the song had.
 */
async function saveSongDetails(
  tx: Pick<typeof db, "insert">,
  songId: number,
  details: CleanSongDetails,
  userId: string,
): Promise<void> {
  const now = new Date();
  const values = {
    status: SONG_METADATA_STATUS.MATCHED,
    source: details.source,
    sourceTrackId: details.sourceTrackId,
    artworkUrl: details.artworkUrl,
    albumName: details.albumName,
    releaseYear: details.releaseYear,
    matchedBy: SONG_METADATA_MATCHED_BY.MANUAL,
    fetchedAt: now,
  };

  await tx
    .insert(schema.songMetadata)
    .values({ songId, ...values, createdBy: userId, updatedBy: userId })
    .onConflictDoUpdate({
      target: schema.songMetadata.songId,
      set: { ...values, updatedAt: now, updatedBy: userId },
    });
}

export { lookUpSongDetails, recordSongMetadata, saveSongDetails };
