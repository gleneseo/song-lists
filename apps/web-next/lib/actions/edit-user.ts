"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { schema, SYSTEM_USER_ID, USER_ROLE } from "@song-lists/db";
import { getAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/queries/client";
import {
  validateUserEdit,
  type UserEditInput,
} from "@/lib/users/validate-user-edit";

interface UpdateUserInput extends UserEditInput {
  userId: string;
}

type UpdateUserResult =
  | { status: "updated" }
  | { status: "duplicate"; email: string }
  | { status: "error"; message: string };

/**
 * Edits a user's profile and role. Admins only. An admin can't change their
 * own role, which also guarantees at least one admin is always left; and an
 * email another user already has is refused.
 */
async function updateUser(input: UpdateUserInput): Promise<UpdateUserResult> {
  const adminId = await getAdminUserId();

  if (!adminId) {
    return { status: "error", message: "Only admins can edit users." };
  }

  if (input.userId === SYSTEM_USER_ID) {
    return { status: "error", message: "The System user can't be edited." };
  }

  if (input.userId === adminId && input.role !== USER_ROLE.ADMIN) {
    return {
      status: "error",
      message: "You can't remove your own admin role.",
    };
  }

  const validation = validateUserEdit(input);

  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const { fields } = validation;

  try {
    const duplicate = await db.query.users.findFirst({
      columns: { id: true },
      where: and(
        sql`lower(${schema.users.email}) = ${fields.email}`,
        ne(schema.users.id, input.userId),
      ),
    });

    if (duplicate) {
      return { status: "duplicate", email: fields.email };
    }

    const updated = await db
      .update(schema.users)
      .set({ ...fields, updatedBy: adminId, updatedAt: new Date() })
      .where(eq(schema.users.id, input.userId))
      .returning({ id: schema.users.id });

    if (updated.length === 0) {
      return { status: "error", message: "That user couldn't be found." };
    }

    return { status: "updated" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to save the user.",
    };
  }
}

export { updateUser };
export type { UpdateUserInput, UpdateUserResult };
