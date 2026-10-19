"use server";

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";
import { schema } from "@song-lists/db";
import { getSession } from "@/lib/auth/auth";
import { db } from "@/lib/queries/client";
import {
  findExistingSong,
  type DuplicateCheckResult,
} from "@/lib/queries/songs";
import { normalizeText } from "@/lib/text/normalize";

type Transaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

type ArtistSelection =
  { kind: "existing"; id: number } | { kind: "new"; name: string };

type ProductionSelection =
  | { kind: "existing"; id: number }
  | { kind: "new"; name: string; releaseYear: number; typeId: number }
  | null;

type CoverSelection =
  | { kind: "existing"; songId: number }
  | { kind: "new"; title: string; artist: ArtistSelection }
  | null;

interface CreateSongInput {
  artist: ArtistSelection;
  title: string;
  bio?: string;
  featuredArtists: ArtistSelection[];
  production: ProductionSelection;
  cover: CoverSelection;
  listIds: number[];
  advocateUserIds: string[];
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

/**
 * Resolves an artist selection to an id, inserting a new artist row when the
 * user chose to create one. New artists are cached by normalized name within
 * a single submission, so e.g. picking "create new" for the same typed name
 * in both the main Artist field and a Featured Artist chip only inserts one
 * row.
 */
async function resolveArtist(
  tx: Transaction,
  selection: ArtistSelection,
  userId: string,
  newArtistsByName: Map<string, number>,
): Promise<number> {
  if (selection.kind === "existing") {
    return selection.id;
  }

  const name = normalizeText(selection.name);

  if (!name) {
    throw new Error("Artist name is required.");
  }

  const cacheKey = name.toLowerCase();
  const cached = newArtistsByName.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const [artist] = await tx
    .insert(schema.artists)
    .values({ name, createdBy: userId, updatedBy: userId })
    .returning({ id: schema.artists.id });

  if (!artist) {
    throw new Error("Expected the artist insert to return a row.");
  }

  newArtistsByName.set(cacheKey, artist.id);
  return artist.id;
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

  try {
    return await db.transaction(async (tx) => {
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

      let productionId: number | null = null;
      if (input.production) {
        if (input.production.kind === "existing") {
          productionId = input.production.id;
        } else {
          const name = normalizeText(input.production.name);

          if (!name) {
            throw new Error("Production name is required.");
          }

          const [production] = await tx
            .insert(schema.productions)
            .values({
              name,
              releaseYear: input.production.releaseYear,
              typeId: input.production.typeId,
              createdBy: userId,
              updatedBy: userId,
            })
            .returning({ id: schema.productions.id });

          if (!production) {
            throw new Error("Expected the production insert to return a row.");
          }

          productionId = production.id;
        }
      }

      let originalSongId: number | null = null;
      if (input.cover) {
        if (input.cover.kind === "existing") {
          originalSongId = input.cover.songId;
        } else {
          const title = normalizeText(input.cover.title);

          if (!title) {
            throw new Error("Cover title is required.");
          }

          const coverArtistId = await resolveArtist(
            tx,
            input.cover.artist,
            userId,
            newArtistsByName,
          );

          const [originalSong] = await tx
            .insert(schema.songs)
            .values({
              title,
              artistId: coverArtistId,
              createdBy: userId,
              updatedBy: userId,
            })
            .returning({ id: schema.songs.id });

          if (!originalSong) {
            throw new Error("Expected the song insert to return a row.");
          }

          originalSongId = originalSong.id;
        }
      }

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

      const advocateUserIds = new Set([userId, ...input.advocateUserIds]);
      await tx.insert(schema.songAdvocates).values(
        Array.from(advocateUserIds).map((advocateUserId) => ({
          songId: song.id,
          userId: advocateUserId,
          createdBy: userId,
          updatedBy: userId,
        })),
      );

      return { status: "created", songId: song.id };
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to add the song.",
    };
  }
}

export { checkDuplicateSong, createSong };
export type {
  ArtistSelection,
  ProductionSelection,
  CoverSelection,
  CreateSongInput,
  CreateSongResult,
  ExistingSongReference,
};
