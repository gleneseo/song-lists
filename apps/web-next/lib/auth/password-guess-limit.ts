/** How many wrong passwords a person may enter, within the window, before being stopped. */
const MAX_WRONG_GUESSES = 5;

/** How long a wrong guess counts against the person. */
const WINDOW_MS = 15 * 60 * 1000;

type GuessCheck = { allowed: true } | { allowed: false; retryAfterMs: number };

/**
 * When each person's recent wrong guesses were made, oldest first. Kept in
 * this server process's memory, like Better Auth's own sign-in limit, so it
 * starts over when the server restarts and isn't shared between servers.
 */
const wrongGuesses = new Map<string, number[]>();

/** The guesses still inside the window, with older ones forgotten. */
function recentGuesses(userId: string, now: number): number[] {
  const recent = (wrongGuesses.get(userId) ?? []).filter(
    (at) => now - at < WINDOW_MS,
  );

  if (recent.length > 0) {
    wrongGuesses.set(userId, recent);
  } else {
    wrongGuesses.delete(userId);
  }

  return recent;
}

/** Whether this person may try a password now, and if not, how long until they can. */
function checkGuessLimit(userId: string, now: number = Date.now()): GuessCheck {
  const recent = recentGuesses(userId, now);
  const oldest = recent[0];

  if (recent.length < MAX_WRONG_GUESSES || oldest === undefined) {
    return { allowed: true };
  }

  return { allowed: false, retryAfterMs: oldest + WINDOW_MS - now };
}

/** Counts a wrong password against this person. */
function recordWrongGuess(userId: string, now: number = Date.now()): void {
  wrongGuesses.set(userId, [...recentGuesses(userId, now), now]);
}

/** Forgets this person's wrong guesses, as when they get the password right. */
function clearWrongGuesses(userId: string): void {
  wrongGuesses.delete(userId);
}

/** What to tell someone who has been stopped. */
function tooManyGuessesMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));

  return `Too many wrong passwords. Try again in ${String(minutes)} ${minutes === 1 ? "minute" : "minutes"}.`;
}

export {
  checkGuessLimit,
  clearWrongGuesses,
  recordWrongGuess,
  tooManyGuessesMessage,
};
