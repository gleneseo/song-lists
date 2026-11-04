import { and, eq, gt, lte } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { WINDOW_MS } from "@/lib/auth/password-guess-limit";
import { db } from "./client";

/** When this person's wrong guesses within the window were made, as milliseconds since the epoch. */
async function getRecentGuessTimes(
  userId: string,
  now: number,
): Promise<number[]> {
  const rows = await db
    .select({ guessedAt: schema.passwordGuesses.guessedAt })
    .from(schema.passwordGuesses)
    .where(
      and(
        eq(schema.passwordGuesses.userId, userId),
        gt(schema.passwordGuesses.guessedAt, new Date(now - WINDOW_MS)),
      ),
    );

  return rows.map((row) => row.guessedAt.getTime());
}

/** Counts a wrong password against this person, and forgets their guesses that are out of the window. */
async function recordWrongGuess(userId: string, now: number): Promise<void> {
  await db
    .insert(schema.passwordGuesses)
    .values({ userId, guessedAt: new Date(now) });
  await db
    .delete(schema.passwordGuesses)
    .where(
      and(
        eq(schema.passwordGuesses.userId, userId),
        lte(schema.passwordGuesses.guessedAt, new Date(now - WINDOW_MS)),
      ),
    );
}

/** Forgets this person's wrong guesses, as when they get the password right. */
async function clearWrongGuesses(userId: string): Promise<void> {
  await db
    .delete(schema.passwordGuesses)
    .where(eq(schema.passwordGuesses.userId, userId));
}

export { clearWrongGuesses, getRecentGuessTimes, recordWrongGuess };
