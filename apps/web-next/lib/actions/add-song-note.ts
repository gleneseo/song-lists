"use server";

import { schema, USER_ROLE } from "@song-lists/db";
import { getSession } from "@/lib/auth/auth";
import { db } from "@/lib/queries/client";
import { getUserAccess } from "@/lib/queries/users";
import { normalizeText } from "@/lib/text/normalize";

type AddSongNoteResult =
  { status: "added" } | { status: "error"; message: string };

/**
 * Adds a note to a song, in the name of whoever is signed in. Admins and
 * managers only, with the role read from the database. Each note is a row of
 * its own, so two people adding one at once both keep theirs.
 */
async function addSongNote(input: {
  songId: number;
  text: string;
}): Promise<AddSongNoteResult> {
  const session = await getSession();
  const user = session?.user ? await getUserAccess(session.user.id) : null;

  if (
    !session?.user ||
    !user ||
    (user.role !== USER_ROLE.ADMIN && user.role !== USER_ROLE.MANAGER)
  ) {
    return {
      status: "error",
      message: "Only admins and managers can add notes.",
    };
  }

  const body = normalizeText(input.text);

  if (!body) {
    return { status: "error", message: "Write a note first." };
  }

  try {
    await db.insert(schema.songNotes).values({
      songId: input.songId,
      body,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    });

    return { status: "added" };
  } catch (error) {
    return { status: "error", message: noteFailure(error) };
  }
}

/** Why a note couldn't be saved, in words for the person who wrote it. */
function noteFailure(error: unknown): string {
  const cause = error instanceof Error ? error.cause : null;

  if (
    cause &&
    typeof cause === "object" &&
    "code" in cause &&
    cause.code === "23503"
  ) {
    return "That song couldn't be found.";
  }

  return error instanceof Error ? error.message : "Failed to add the note.";
}

export { addSongNote };
export type { AddSongNoteResult };
