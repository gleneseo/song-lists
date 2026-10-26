"use server";

import { SONG_METADATA_STATUS } from "@song-lists/db";
import { getAdminUserId } from "@/lib/auth/admin";
import { lookUpSongDetails } from "@/lib/queries/song-metadata";
import type { SongDetailsInput } from "@/lib/songs/song-details-input";
import { normalizeText } from "@/lib/text/normalize";

type FindSongDetailsResult =
  | {
      status: "found";
      details: SongDetailsInput;
      /** The song the service matched, whose spelling can differ a little from what was asked for. */
      matched: { title: string; artistName: string };
    }
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * Asks the music services what they know about a song, for an admin to look
 * over and correct before saving it. Nothing is saved here. The lookup can
 * take several seconds, so the form starts it from a button and waits.
 */
async function findSongDetails(song: {
  title: string;
  artistName: string;
}): Promise<FindSongDetailsResult> {
  if (!(await getAdminUserId())) {
    return {
      status: "error",
      message: "Only admins can look up album details.",
    };
  }

  const title = normalizeText(song.title);
  const artistName = normalizeText(song.artistName);

  if (!title || !artistName) {
    return {
      status: "error",
      message: "Give the song a title and an artist to look it up.",
    };
  }

  const result = await lookUpSongDetails({ title, artistName });

  if (result.status === SONG_METADATA_STATUS.ERROR) {
    return {
      status: "error",
      message: `The lookup didn't work (${result.message}). Try again in a moment.`,
    };
  }

  if (result.status === SONG_METADATA_STATUS.NOT_FOUND) {
    return { status: "not_found" };
  }

  return {
    status: "found",
    matched: {
      title: result.matchedTitle ?? title,
      artistName: result.matchedArtistName ?? artistName,
    },
    details: {
      albumName: result.albumName ?? "",
      releaseYear:
        result.releaseYear === null ? "" : String(result.releaseYear),
      artworkUrl: result.artworkUrl ?? "",
      source: result.source,
      sourceTrackId: result.sourceTrackId,
    },
  };
}

export { findSongDetails };
export type { FindSongDetailsResult };
