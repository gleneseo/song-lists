/** How many wrong passwords a person may enter, within the window, before being stopped. */
const MAX_WRONG_GUESSES = 5;

/** How long a wrong guess counts against the person. */
const WINDOW_MS = 15 * 60 * 1000;

type GuessCheck = { allowed: true } | { allowed: false; retryAfterMs: number };

/**
 * Whether a person may try a password now, given when their wrong guesses
 * were made (any order), and if not, how long until they can. Guesses older
 * than the window no longer count.
 */
function checkGuessLimit(
  guessTimes: readonly number[],
  now: number,
): GuessCheck {
  const recent = guessTimes
    .filter((at) => now - at < WINDOW_MS)
    .sort((a, b) => a - b);
  const oldest = recent[0];

  if (recent.length < MAX_WRONG_GUESSES || oldest === undefined) {
    return { allowed: true };
  }

  return { allowed: false, retryAfterMs: oldest + WINDOW_MS - now };
}

/** What to tell someone who has been stopped. */
function tooManyGuessesMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));

  return `Too many wrong passwords. Try again in ${String(minutes)} ${minutes === 1 ? "minute" : "minutes"}.`;
}

export { checkGuessLimit, tooManyGuessesMessage, WINDOW_MS };
