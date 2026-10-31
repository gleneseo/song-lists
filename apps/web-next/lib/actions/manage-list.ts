"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { getAdminUserId } from "@/lib/auth/admin";
import { MASTER_LIST_NAME } from "@/lib/lists/list-view";
import { validateList, type ListInput } from "@/lib/lists/validate-list";
import { db } from "@/lib/queries/client";

type SaveListResult =
  | { status: "saved"; listId: number }
  | { status: "duplicate"; name: string }
  | { status: "error"; message: string };

type DeleteListResult =
  { status: "deleted" } | { status: "error"; message: string };

/** Whether another list already has this name, ignoring case. */
async function nameTaken(name: string, exceptId?: number): Promise<boolean> {
  const existing = await db.query.lists.findFirst({
    columns: { id: true },
    where: and(
      sql`lower(${schema.lists.name}) = lower(${name})`,
      exceptId === undefined ? undefined : ne(schema.lists.id, exceptId),
    ),
  });

  return existing !== undefined;
}

/** Creates a list. Admins only; refuses a name another list already has. */
async function createList(input: ListInput): Promise<SaveListResult> {
  const adminId = await getAdminUserId();

  if (!adminId) {
    return { status: "error", message: "Only admins can create lists." };
  }

  const validation = validateList(input);

  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  try {
    if (await nameTaken(validation.name)) {
      return { status: "duplicate", name: validation.name };
    }

    const [created] = await db
      .insert(schema.lists)
      .values({
        name: validation.name,
        extraColumns: validation.extraColumns,
        createdBy: adminId,
        updatedBy: adminId,
      })
      .returning({ id: schema.lists.id });

    if (!created) {
      return { status: "error", message: "Failed to create the list." };
    }

    return { status: "saved", listId: created.id };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to create the list.",
    };
  }
}

/**
 * Edits a list's name and optional columns. Admins only. The Master List is
 * found by its name (the dashboard and the default sort depend on it), so it
 * can't be renamed; another list can't take a name that's already in use.
 */
async function updateList(
  input: ListInput & { listId: number },
): Promise<SaveListResult> {
  const adminId = await getAdminUserId();

  if (!adminId) {
    return { status: "error", message: "Only admins can edit lists." };
  }

  const validation = validateList(input);

  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  try {
    const current = await db.query.lists.findFirst({
      columns: { name: true },
      where: eq(schema.lists.id, input.listId),
    });

    if (!current) {
      return { status: "error", message: "That list couldn't be found." };
    }

    if (
      current.name === MASTER_LIST_NAME &&
      validation.name !== MASTER_LIST_NAME
    ) {
      return {
        status: "error",
        message: `${MASTER_LIST_NAME} can't be renamed.`,
      };
    }

    if (await nameTaken(validation.name, input.listId)) {
      return { status: "duplicate", name: validation.name };
    }

    await db
      .update(schema.lists)
      .set({
        name: validation.name,
        extraColumns: validation.extraColumns,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(schema.lists.id, input.listId));

    return { status: "saved", listId: input.listId };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to save the list.",
    };
  }
}

/**
 * Deletes a list and takes its songs off it. Admins only. The songs
 * themselves stay in the catalog and on their other lists. The Master List
 * can't be deleted.
 */
async function deleteList(listId: number): Promise<DeleteListResult> {
  const adminId = await getAdminUserId();

  if (!adminId) {
    return { status: "error", message: "Only admins can delete lists." };
  }

  try {
    return await db.transaction(async (tx) => {
      const current = await tx.query.lists.findFirst({
        columns: { name: true },
        where: eq(schema.lists.id, listId),
      });

      if (!current) {
        return { status: "error", message: "That list couldn't be found." };
      }

      if (current.name === MASTER_LIST_NAME) {
        return {
          status: "error",
          message: `${MASTER_LIST_NAME} can't be deleted.`,
        };
      }

      await tx
        .delete(schema.listSongs)
        .where(eq(schema.listSongs.listId, listId));
      await tx.delete(schema.lists).where(eq(schema.lists.id, listId));

      return { status: "deleted" };
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to delete the list.",
    };
  }
}

export { createList, deleteList, updateList };
export type { DeleteListResult, SaveListResult };
