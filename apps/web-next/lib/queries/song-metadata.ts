import { SONG_METADATA_STATUS } from "@song-lists/db";
import {
  createSongLookup,
  recordSongMetadata as lookUpAndRecord,
} from "@song-lists/song-metadata";
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

export { recordSongMetadata };
