import { describe, expect, it } from "vitest";
import {
  checkGuessLimit,
  tooManyGuessesMessage,
} from "@/lib/auth/password-guess-limit";

const MINUTE = 60_000;

/** Wrong guesses made once a minute, starting at time zero. */
const guessesEveryMinute = (count: number): number[] =>
  Array.from({ length: count }, (_, guess) => guess * MINUTE);

describe("password-guess-limit", () => {
  it("should allow a person who has made no wrong guesses", () => {
    expect(checkGuessLimit([], 0)).toEqual({ allowed: true });
  });

  it("should allow four wrong guesses and stop the fifth try from going on", () => {
    expect(checkGuessLimit([0, 1000, 2000, 3000], 5000)).toEqual({
      allowed: true,
    });
    expect(checkGuessLimit([0, 1000, 2000, 3000, 5000], 6000).allowed).toBe(
      false,
    );
  });

  it("should say how long until the oldest guess is forgotten", () => {
    expect(checkGuessLimit(guessesEveryMinute(5), 5 * MINUTE)).toEqual({
      allowed: false,
      retryAfterMs: 10 * MINUTE,
    });
  });

  it("should allow tries again once the oldest guess is more than 15 minutes old", () => {
    const guesses = guessesEveryMinute(5);

    expect(checkGuessLimit(guesses, 15 * MINUTE - 1).allowed).toBe(false);
    expect(checkGuessLimit(guesses, 15 * MINUTE)).toEqual({ allowed: true });
  });

  it("should not care what order the guesses are given in", () => {
    expect(
      checkGuessLimit(
        [4 * MINUTE, 0, 2 * MINUTE, MINUTE, 3 * MINUTE],
        5 * MINUTE,
      ),
    ).toEqual({ allowed: false, retryAfterMs: 10 * MINUTE });
  });
});

describe("tooManyGuessesMessage", () => {
  it("should round the wait up to whole minutes", () => {
    expect(tooManyGuessesMessage(90_000)).toBe(
      "Too many wrong passwords. Try again in 2 minutes.",
    );
  });

  it("should say one minute, never zero", () => {
    expect(tooManyGuessesMessage(1)).toBe(
      "Too many wrong passwords. Try again in 1 minute.",
    );
  });
});
