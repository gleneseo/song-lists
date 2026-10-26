"use server";

import { schema } from "@song-lists/db";
import { after } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { db } from "@/lib/queries/client";
import {
  recordSongMetadata,
  saveSongDetails,
} from "@/lib/queries/song-metadata";
import {
  findExistingSong,
  type DuplicateCheckResult,
} from "@/lib/queries/songs";
import { findStyleIssues, type StyleIssue } from "@/lib/songs/name-style";
import {
  cleanSongDetails,
  type SongDetailsInput,
} from "@/lib/songs/song-details-input";
import {
  resolveArtist,
  resolveCover,
  resolveProduction,
  type ArtistSelection,
  type CoverSelection,
  type ProductionSelection,
} from "@/lib/songs/resolve-selections";
import { normalizeText } from "@/lib/text/normalize";

interface CreateSongInput {
  artist: ArtistSelection;
  title: string;
  bio?: string;
  featuredArtists: ArtistSelection[];
  production: ProductionSelection;
  cover: CoverSelection;
  listIds: number[];
  advocateUserIds: string[];
  /**
   * New names (as they'd be saved) that someone has said are deliberately
   * stylized and should be let through despite breaking our style.
   */
  styleOverrides?: string[];
  /**
   * Album details looked up and settled on in the form, to save with the song
   * instead of leaving it to the automatic lookup.
   */
  details?: SongDetailsInput;
}

interface ExistingSongReference {
  id: number;
  resourceId: string;
  title: string;
  artistName: string;
}

type CreateSongResult =
  | { status: "created"; songId: number }
  | { status: "duplicate"; existing: ExistingSongReference }
  | { status: "style"; issues: StyleIssue[] }
  | { status: "error"; message: string };

/** Below this, two titles are treated as coincidentally similar, not the same song. */
async function checkDuplicateSong(input: {
  artistId: number;
  title: string;
}): Promise<DuplicateCheckResult> {
  const normalizedTitle = normalizeText(input.title);

  if (!normalizedTitle) {
    return { exact: null, near: null };
  }

  return findExistingSong(input.artistId, normalizedTitle);
}

async function createSong(input: CreateSongInput): Promise<CreateSongResult> {
  const session = await getSession();

  if (!session?.user) {
    return {
      status: "error",
      message: "You must be signed in to add a song.",
    };
  }

  const userId = session.user.id;
  const normalizedTitle = normalizeText(input.title);

  const details = input.details ? cleanSongDetails(input.details) : null;

  if (details?.status === "error") {
    return { status: "error", message: details.message };
  }

  if (!normalizedTitle) {
    return { status: "error", message: "Title is required." };
  }

  if (input.artist.kind === "existing") {
    const duplicate = await findExistingSong(input.artist.id, normalizedTitle);

    if (duplicate.exact) {
      return {
        status: "duplicate",
        existing: {
          id: duplicate.exact.id,
          resourceId: duplicate.exact.resourceId,
          title: duplicate.exact.title,
          artistName: duplicate.exact.artistName,
        },
      };
    }
  }

  // Checked on the server so it can't be skipped: nothing new is created
  // until each name follows our style or has been waved through.
  const styleIssues = findStyleIssues(input, input.styleOverrides ?? []);

  if (styleIssues.length > 0) {
    return { status: "style", issues: styleIssues };
  }

  let songId: number;

  try {
    songId = await db.transaction(async (tx) => {
      const newArtistsByName = new Map<string, number>();
      const artistId = await resolveArtist(
        tx,
        input.artist,
        userId,
        newArtistsByName,
      );

      const featuredArtistIds: number[] = [];
      for (const featured of input.featuredArtists) {
        const featuredArtistId = await resolveArtist(
          tx,
          featured,
          userId,
          newArtistsByName,
        );

        if (
          featuredArtistId !== artistId &&
          !featuredArtistIds.includes(featuredArtistId)
        ) {
          featuredArtistIds.push(featuredArtistId);
        }
      }

      const productionId = await resolveProduction(
        tx,
        input.production,
        userId,
      );
      const originalSongId = await resolveCover(
        tx,
        input.cover,
        userId,
        newArtistsByName,
      );

      const [song] = await tx
        .insert(schema.songs)
        .values({
          title: normalizedTitle,
          artistId,
          bio: input.bio ? normalizeText(input.bio) : null,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning({ id: schema.songs.id });

      if (!song) {
        throw new Error("Expected the song insert to return a row.");
      }

      if (featuredArtistIds.length > 0) {
        await tx.insert(schema.songFeaturedArtists).values(
          featuredArtistIds.map((featuredArtistId) => ({
            songId: song.id,
            artistId: featuredArtistId,
            createdBy: userId,
            updatedBy: userId,
          })),
        );
      }

      if (productionId !== null) {
        await tx.insert(schema.songProductions).values({
          songId: song.id,
          productionId,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      if (originalSongId !== null) {
        await tx.insert(schema.songCovers).values({
          songId: song.id,
          originalSongId,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      if (input.listIds.length > 0) {
        await tx.insert(schema.listSongs).values(
          input.listIds.map((listId) => ({
            listId,
            songId: song.id,
            createdBy: userId,
            updatedBy: userId,
          })),
        );
      }

      if (details) {
        await saveSongDetails(tx, song.id, details.details, userId);
      }

      const advocateUserIds = new Set([userId, ...input.advocateUserIds]);
      await tx.insert(schema.songAdvocates).values(
        Array.from(advocateUserIds).map((advocateUserId) => ({
          songId: song.id,
          userId: advocateUserId,
          createdBy: userId,
          updatedBy: userId,
        })),
      );

      return song.id;
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to add the song.",
    };
  }

  // Once the response is on its way, so the art and album never hold up
  // adding a song (or fail it). Someone who set the details has no need.
  if (!details) {
    after(() => recordSongMetadata(songId));
  }

  return { status: "created", songId };
}

export { checkDuplicateSong, createSong };
export type { CreateSongInput, CreateSongResult, ExistingSongReference };
