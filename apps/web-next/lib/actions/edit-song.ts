"use server";

import { eq, inArray } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { getAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/queries/client";
import {
  getSongEditData,
  getSongLinks,
  type SongEditData,
} from "@/lib/queries/song-edit";
import { findExistingSong, type ExistingSongMatch } from "@/lib/queries/songs";
import { getUserAccess } from "@/lib/queries/users";
import { diffIds } from "@/lib/songs/diff-ids";
import { formatNote } from "@/lib/songs/format-note";
import {
  resolveArtist,
  resolveCover,
  resolveProduction,
  type ArtistSelection,
  type CoverSelection,
  type ProductionSelection,
} from "@/lib/songs/resolve-selections";
import { normalizeText } from "@/lib/text/normalize";

interface UpdateSongInput {
  songId: number;
  title: string;
  bio: string;
  /** The notes as the form loaded them, to tell whether they were edited and whether someone else changed them meanwhile. */
  originalBio: string;
  /** A new note to sign and add to the end of the bio; blank for none. */
  newNote: string;
  artist: ArtistSelection;
  featuredArtists: ArtistSelection[];
  /** Production links to keep; any current link not listed here is removed. */
  keepProductionIds: number[];
  addProduction: ProductionSelection;
  /** Original songs this one still covers; any current cover not listed here is removed. */
  keepCoverSongIds: number[];
  addCover: CoverSelection;
  listIds: number[];
  advocateUserIds: string[];
}

type LoadSongForEditResult =
  { status: "ok"; data: SongEditData } | { status: "error"; message: string };

type UpdateSongResult =
  | { status: "updated" }
  | {
      status: "duplicate";
      existing: Pick<ExistingSongMatch, "id" | "title" | "artistName">;
    }
  | { status: "error"; message: string };

const NOT_ADMIN = "Only admins can edit songs.";

/** Loads a song's current values and the choices for editing it. Admins only. */
async function loadSongForEdit(songId: number): Promise<LoadSongForEditResult> {
  if (!(await getAdminUserId())) {
    return { status: "error", message: NOT_ADMIN };
  }

  const data = await getSongEditData(songId);

  return data
    ? { status: "ok", data }
    : { status: "error", message: "That song couldn't be found." };
}

/**
 * Applies an admin's edits to a song: its own fields, then each linked set
 * (featured artists, productions, covers, lists, advocates) is brought in
 * line with what the form submitted. All of it happens in one transaction,
 * so a failure part-way leaves the song as it was.
 */
async function updateSong(input: UpdateSongInput): Promise<UpdateSongResult> {
  const userId = await getAdminUserId();

  if (!userId) {
    return { status: "error", message: NOT_ADMIN };
  }

  const title = normalizeText(input.title);

  if (!title) {
    return { status: "error", message: "Title is required." };
  }

  const author = (await getUserAccess(userId))?.name ?? "An admin";
  const note = formatNote(input.newNote, author, new Date());

  if (input.artist.kind === "existing") {
    const duplicate = await findExistingSong(input.artist.id, title);

    if (duplicate.exact && duplicate.exact.id !== input.songId) {
      return {
        status: "duplicate",
        existing: {
          id: duplicate.exact.id,
          title: duplicate.exact.title,
          artistName: duplicate.exact.artistName,
        },
      };
    }
  }

  try {
    await db.transaction(async (tx) => {
      const [song] = await tx
        .select({ bio: schema.songs.bio })
        .from(schema.songs)
        .where(eq(schema.songs.id, input.songId))
        .for("update");

      if (!song) {
        throw new Error("That song couldn't be found.");
      }

      const bio = mergedBio(input, song.bio ?? "", note);

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

        if (featuredArtistId !== artistId) {
          featuredArtistIds.push(featuredArtistId);
        }
      }

      const addedProductionId = await resolveProduction(
        tx,
        input.addProduction,
        userId,
      );
      const addedCoverSongId = await resolveCover(
        tx,
        input.addCover,
        userId,
        newArtistsByName,
      );

      if (addedCoverSongId === input.songId) {
        throw new Error("A song can't be a cover of itself.");
      }

      await tx
        .update(schema.songs)
        .set({
          title,
          artistId,
          bio,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(schema.songs.id, input.songId));

      const links = await getSongLinks(tx, input.songId);

      await syncLinks({
        current: links.featured,
        desired: featuredArtistIds,
        remove: (ids) =>
          tx
            .delete(schema.songFeaturedArtists)
            .where(inArray(schema.songFeaturedArtists.id, ids)),
        add: (targets) =>
          tx.insert(schema.songFeaturedArtists).values(
            targets.map((target) => ({
              songId: input.songId,
              artistId: target,
              createdBy: userId,
              updatedBy: userId,
            })),
          ),
      });

      await syncLinks({
        current: links.productions,
        desired: [
          ...input.keepProductionIds,
          ...(addedProductionId === null ? [] : [addedProductionId]),
        ],
        remove: (ids) =>
          tx
            .delete(schema.songProductions)
            .where(inArray(schema.songProductions.id, ids)),
        add: (targets) =>
          tx.insert(schema.songProductions).values(
            targets.map((target) => ({
              songId: input.songId,
              productionId: target,
              createdBy: userId,
              updatedBy: userId,
            })),
          ),
      });

      await syncLinks({
        current: links.covers,
        desired: [
          ...input.keepCoverSongIds,
          ...(addedCoverSongId === null ? [] : [addedCoverSongId]),
        ],
        remove: (ids) =>
          tx
            .delete(schema.songCovers)
            .where(inArray(schema.songCovers.id, ids)),
        add: (targets) =>
          tx.insert(schema.songCovers).values(
            targets.map((target) => ({
              songId: input.songId,
              originalSongId: target,
              createdBy: userId,
              updatedBy: userId,
            })),
          ),
      });

      await syncLinks({
        current: links.lists,
        desired: input.listIds,
        remove: (ids) =>
          tx.delete(schema.listSongs).where(inArray(schema.listSongs.id, ids)),
        add: (targets) =>
          tx.insert(schema.listSongs).values(
            targets.map((target) => ({
              listId: target,
              songId: input.songId,
              createdBy: userId,
              updatedBy: userId,
            })),
          ),
      });

      await syncLinks({
        current: links.advocates,
        desired: input.advocateUserIds,
        remove: (ids) =>
          tx
            .delete(schema.songAdvocates)
            .where(inArray(schema.songAdvocates.id, ids)),
        add: (targets) =>
          tx.insert(schema.songAdvocates).values(
            targets.map((target) => ({
              songId: input.songId,
              userId: target,
              createdBy: userId,
              updatedBy: userId,
            })),
          ),
      });
    });

    return { status: "updated" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to save the song.",
    };
  }
}

/**
 * The notes to save. If the form left the notes alone, the notes as they are
 * now are kept, so a note someone else added while the form was open isn't
 * lost. If the form changed them, they replace the notes -- unless someone
 * else changed them too, which can't be reconciled. Any new note goes on the
 * end. Only trimmed, not normalized, so the line breaks between notes survive.
 */
function mergedBio(
  input: Pick<UpdateSongInput, "bio" | "originalBio">,
  current: string,
  note: string | null,
): string | null {
  const editedHere = input.bio !== input.originalBio;

  if (editedHere && current !== input.originalBio) {
    throw new Error(
      "The notes were changed by someone else while you were editing. Close this form and open it again to see their changes.",
    );
  }

  const base = editedHere ? input.bio : current;

  return [base.trim(), note].filter(Boolean).join("\n") || null;
}

/**
 * Brings one set of linked rows in line with `desired`: rows whose target
 * isn't wanted any more are deleted, and wanted targets that have no row yet
 * are inserted. Rows that are already right are left untouched.
 */
async function syncLinks<Target extends string | number>({
  current,
  desired,
  remove,
  add,
}: {
  current: { id: number; target: Target }[];
  desired: Target[];
  remove: (rowIds: number[]) => PromiseLike<unknown>;
  add: (targets: Target[]) => PromiseLike<unknown>;
}) {
  const { toRemove, toAdd } = diffIds(
    current.map((row) => row.target),
    desired,
  );

  if (toRemove.length > 0) {
    const removing = new Set(toRemove);
    await remove(
      current.filter((row) => removing.has(row.target)).map((row) => row.id),
    );
  }

  if (toAdd.length > 0) {
    await add(toAdd);
  }
}

export { loadSongForEdit, updateSong };
export type { LoadSongForEditResult, UpdateSongInput, UpdateSongResult };
