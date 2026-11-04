"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { auth, getSession } from "@/lib/auth/auth";
import {
  checkGuessLimit,
  tooManyGuessesMessage,
} from "@/lib/auth/password-guess-limit";
import { db } from "@/lib/queries/client";
import {
  clearWrongGuesses,
  getRecentGuessTimes,
  recordWrongGuess,
} from "@/lib/queries/password-guesses";
import { validateEmail } from "@/lib/users/validate-email";
import { validatePassword } from "@/lib/users/validate-password";

type ChangeAccountResult =
  { status: "changed" } | { status: "error"; message: string };

const NOT_SIGNED_IN = "Sign in to change your account.";
const WRONG_PASSWORD = "Your current password isn't right.";

/**
 * Checks `password` against the signed-in person's own password. Signing in
 * is not proof enough for changing how they sign in: a borrowed or left-open
 * session shouldn't be able to take the account over.
 */
async function isCurrentPassword(
  userId: string,
  password: string,
): Promise<boolean> {
  const credential = await db.query.accounts.findFirst({
    columns: { password: true },
    where: and(
      eq(schema.accounts.userId, userId),
      eq(schema.accounts.providerId, "credential"),
    ),
  });

  if (!credential?.password) {
    return false;
  }

  const context = await auth.$context;

  return context.password.verify({
    hash: credential.password,
    password,
  });
}

/**
 * The reason to refuse, or `null` when `password` is the signed-in person's
 * own. Wrong guesses are counted, and too many in a short while stop further
 * tries -- even with the right password -- so a session left open can't be
 * used to guess the password.
 */
async function checkCurrentPassword(
  userId: string,
  password: string,
): Promise<string | null> {
  const now = Date.now();
  const limit = checkGuessLimit(await getRecentGuessTimes(userId, now), now);

  if (!limit.allowed) {
    return tooManyGuessesMessage(limit.retryAfterMs);
  }

  if (await isCurrentPassword(userId, password)) {
    await clearWrongGuesses(userId);

    return null;
  }

  await recordWrongGuess(userId, now);

  return WRONG_PASSWORD;
}

/**
 * Changes the signed-in person's own email address, which is what they sign
 * in with. Needs their current password. There is no confirmation message
 * sent to the new address; the password check stands in for it. An address
 * another account already has is refused.
 */
async function changeMyEmail(input: {
  newEmail: string;
  currentPassword: string;
}): Promise<ChangeAccountResult> {
  const session = await getSession();

  if (!session?.user) {
    return { status: "error", message: NOT_SIGNED_IN };
  }

  const validation = validateEmail(input.newEmail);

  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  try {
    const refusal = await checkCurrentPassword(
      session.user.id,
      input.currentPassword,
    );

    if (refusal) {
      return { status: "error", message: refusal };
    }

    const taken = await db.query.users.findFirst({
      columns: { id: true },
      where: and(
        sql`lower(${schema.users.email}) = ${validation.email}`,
        ne(schema.users.id, session.user.id),
      ),
    });

    if (taken) {
      return {
        status: "error",
        message: "Another account already uses that email address.",
      };
    }

    await db
      .update(schema.users)
      .set({
        email: validation.email,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, session.user.id));

    return { status: "changed" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to change the email.",
    };
  }
}

/**
 * Changes the signed-in person's own password. Needs their current one. Every
 * other session they have is ended, so a device that was signed in with the
 * old password has to sign in again; the one they are using stays signed in.
 */
async function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ChangeAccountResult> {
  const session = await getSession();

  if (!session?.user) {
    return { status: "error", message: NOT_SIGNED_IN };
  }

  const invalid = validatePassword(input.newPassword);

  if (invalid) {
    return { status: "error", message: invalid };
  }

  if (input.newPassword === input.currentPassword) {
    return {
      status: "error",
      message: "Choose a password different from your current one.",
    };
  }

  try {
    const refusal = await checkCurrentPassword(
      session.user.id,
      input.currentPassword,
    );

    if (refusal) {
      return { status: "error", message: refusal };
    }

    const context = await auth.$context;
    const hash = await context.password.hash(input.newPassword);

    await context.internalAdapter.updatePassword(session.user.id, hash);
    await db
      .delete(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, session.user.id),
          ne(schema.sessions.id, session.session.id),
        ),
      );

    return { status: "changed" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to change the password.",
    };
  }
}

export { changeMyEmail, changeMyPassword };
export type { ChangeAccountResult };
