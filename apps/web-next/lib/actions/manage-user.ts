"use server";

import { eq } from "drizzle-orm";
import { schema, SYSTEM_USER_ID } from "@song-lists/db";
import { auth } from "@/lib/auth/auth";
import { getAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/queries/client";
import { validatePassword } from "@/lib/users/validate-password";

type ManageUserResult =
  { status: "done" } | { status: "error"; message: string };

/** The admin's ID when they may act on `userId`, otherwise the error to show. */
async function authorize(
  userId: string,
  verb: string,
): Promise<{ adminId: string } | { error: string }> {
  const adminId = await getAdminUserId();

  if (!adminId) {
    return { error: "Only admins can manage users." };
  }

  if (userId === SYSTEM_USER_ID) {
    return { error: "The System user can't be managed." };
  }

  if (userId === adminId) {
    return { error: `You can't ${verb} your own account here.` };
  }

  return { adminId };
}

/**
 * Sets a new password for a user. Admins only. Passwords are stored hashed so
 * the old one can't be shown; the admin chooses the new one and passes it on.
 * Every session the user has is ended, so the new password is needed to get
 * back in.
 */
async function resetUserPassword(input: {
  userId: string;
  password: string;
}): Promise<ManageUserResult> {
  const allowed = await authorize(input.userId, "reset the password of");

  if ("error" in allowed) {
    return { status: "error", message: allowed.error };
  }

  const invalid = validatePassword(input.password);

  if (invalid) {
    return { status: "error", message: invalid };
  }

  try {
    const context = await auth.$context;
    const hash = await context.password.hash(input.password);
    const credential = await db.query.accounts.findFirst({
      columns: { id: true },
      where: (accounts, { and, eq }) =>
        and(
          eq(accounts.userId, input.userId),
          eq(accounts.providerId, "credential"),
        ),
    });

    if (!credential) {
      return {
        status: "error",
        message: "That user signs in without a password.",
      };
    }

    await context.internalAdapter.updatePassword(input.userId, hash);
    await db
      .delete(schema.sessions)
      .where(eq(schema.sessions.userId, input.userId));

    return { status: "done" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to reset the password.",
    };
  }
}

/**
 * Deactivates a user (or reactivates them). Admins only. Their songs, lists
 * and history stay; they just can't sign in, and any session they have is
 * ended straight away.
 */
async function setUserActive(input: {
  userId: string;
  active: boolean;
}): Promise<ManageUserResult> {
  const allowed = await authorize(input.userId, "deactivate");

  if ("error" in allowed) {
    return { status: "error", message: allowed.error };
  }

  try {
    const updated = await db
      .update(schema.users)
      .set({
        deactivatedAt: input.active ? null : new Date(),
        updatedBy: allowed.adminId,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, input.userId))
      .returning({ id: schema.users.id });

    if (updated.length === 0) {
      return { status: "error", message: "That user couldn't be found." };
    }

    if (!input.active) {
      await db
        .delete(schema.sessions)
        .where(eq(schema.sessions.userId, input.userId));
    }

    return { status: "done" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to update the user.",
    };
  }
}

export { resetUserPassword, setUserActive };
export type { ManageUserResult };
