"use server";

import { eq, sql } from "drizzle-orm";
import { schema, USER_ROLE } from "@song-lists/db";
import { getSession } from "@/lib/auth/auth";
import { db } from "@/lib/queries/client";
import { getUserAccess } from "@/lib/queries/users";
import { formatNote } from "@/lib/songs/format-note";

type AddSongNoteResult =
  { status: "added" } | { status: "error"; message: string };

/**
 * Adds a signed, dated note to the end of a song's bio. Admins and managers
 * only, with the role read from the database. The note is appended in SQL so
 * two people adding one at once both keep theirs.
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

  const now = new Date();
  const note = formatNote(input.text, user.name, now);

  if (!note) {
    return { status: "error", message: "Write a note first." };
  }

  try {
    const updated = await db
      .update(schema.songs)
      .set({
        bio: sql`CASE WHEN coalesce(${schema.songs.bio}, '') = '' THEN ${note} ELSE ${schema.songs.bio} || E'\n' || ${note} END`,
        updatedBy: session.user.id,
        updatedAt: now,
      })
      .where(eq(schema.songs.id, input.songId))
      .returning({ id: schema.songs.id });

    if (updated.length === 0) {
      return { status: "error", message: "That song couldn't be found." };
    }

    return { status: "added" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to add the note.",
    };
  }
}

export { addSongNote };
export type { AddSongNoteResult };
