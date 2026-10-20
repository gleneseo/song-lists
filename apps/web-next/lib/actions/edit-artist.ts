"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { getAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/queries/client";
import { normalizeText } from "@/lib/text/normalize";

interface UpdateArtistInput {
  artistId: number;
  name: string;
}

type UpdateArtistResult =
  | { status: "updated" }
  | { status: "duplicate"; existingName: string }
  | { status: "error"; message: string };

/** Renames an artist. Admins only; refuses a name another artist already has. */
async function updateArtist(
  input: UpdateArtistInput,
): Promise<UpdateArtistResult> {
  const userId = await getAdminUserId();

  if (!userId) {
    return { status: "error", message: "Only admins can edit artists." };
  }

  const name = normalizeText(input.name);

  if (!name) {
    return { status: "error", message: "Name is required." };
  }

  try {
    const duplicate = await db.query.artists.findFirst({
      columns: { name: true },
      where: and(
        sql`lower(${schema.artists.name}) = lower(${name})`,
        ne(schema.artists.id, input.artistId),
      ),
    });

    if (duplicate) {
      return { status: "duplicate", existingName: duplicate.name };
    }

    const updated = await db
      .update(schema.artists)
      .set({ name, updatedBy: userId, updatedAt: new Date() })
      .where(eq(schema.artists.id, input.artistId))
      .returning({ id: schema.artists.id });

    if (updated.length === 0) {
      return { status: "error", message: "That artist couldn't be found." };
    }

    return { status: "updated" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to save the artist.",
    };
  }
}

export { updateArtist };
export type { UpdateArtistInput, UpdateArtistResult };
