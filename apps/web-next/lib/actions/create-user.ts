"use server";

import { eq, sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { auth } from "@/lib/auth/auth";
import { getAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/queries/client";
import {
  validateNewUser,
  type NewUserInput,
} from "@/lib/users/validate-new-user";

type CreateUserResult =
  | { status: "created"; userId: string }
  | { status: "duplicate"; email: string }
  | { status: "error"; message: string };

/**
 * Creates a user with a password the admin chooses and passes on. Admins
 * only. The account is made through Better Auth, the way sign-up does, so it
 * can sign in straight away; an email another user already has is refused.
 */
async function createUser(input: NewUserInput): Promise<CreateUserResult> {
  const adminId = await getAdminUserId();

  if (!adminId) {
    return { status: "error", message: "Only admins can create users." };
  }

  const validation = validateNewUser(input);

  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const { fields, password } = validation;

  try {
    const duplicate = await db.query.users.findFirst({
      columns: { id: true },
      where: sql`lower(${schema.users.email}) = ${fields.email}`,
    });

    if (duplicate) {
      return { status: "duplicate", email: fields.email };
    }

    const { user } = await auth.api.signUpEmail({
      body: { name: fields.name, email: fields.email, password },
    });

    // Sign-up signs the new user in; an admin creating an account for someone
    // else shouldn't leave a live session behind for it.
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
    await db
      .update(schema.users)
      .set({
        firstName: fields.firstName,
        lastName: fields.lastName,
        role: fields.role,
        bio: fields.bio,
        createdBy: adminId,
        updatedBy: adminId,
      })
      .where(eq(schema.users.id, user.id));

    return { status: "created", userId: user.id };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to create the user.",
    };
  }
}

export { createUser };
export type { CreateUserResult };
