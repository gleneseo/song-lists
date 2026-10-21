import { describe, expect, it } from "vitest";
import {
  checkGuessLimit,
  clearWrongGuesses,
  recordWrongGuess,
  tooManyGuessesMessage,
} from "@/lib/auth/password-guess-limit";

const MINUTE = 60_000;

describe("password-guess-limit", () => {
  it("should allow a person who has made no wrong guesses", () => {
    expect(checkGuessLimit("nobody-yet", 0)).toEqual({ allowed: true });
  });

  it("should allow four wrong guesses and stop the fifth try from going on", () => {
    for (let guess = 0; guess < 4; guess++) {
      recordWrongGuess("four", guess * 1000);
    }

    expect(checkGuessLimit("four", 5000)).toEqual({ allowed: true });

    recordWrongGuess("four", 5000);

    expect(checkGuessLimit("four", 6000).allowed).toBe(false);
  });

  it("should say how long until the oldest guess is forgotten", () => {
    for (let guess = 0; guess < 5; guess++) {
      recordWrongGuess("waiting", guess * MINUTE);
    }

    expect(checkGuessLimit("waiting", 5 * MINUTE)).toEqual({
      allowed: false,
      retryAfterMs: 10 * MINUTE,
    });
  });

  it("should allow tries again once the oldest guess is more than 15 minutes old", () => {
    for (let guess = 0; guess < 5; guess++) {
      recordWrongGuess("later", guess * MINUTE);
    }

    expect(checkGuessLimit("later", 15 * MINUTE - 1).allowed).toBe(false);
    expect(checkGuessLimit("later", 15 * MINUTE)).toEqual({ allowed: true });
  });

  it("should keep each person's guesses apart", () => {
    for (let guess = 0; guess < 5; guess++) {
      recordWrongGuess("one", 0);
    }

    expect(checkGuessLimit("one", 1).allowed).toBe(false);
    expect(checkGuessLimit("another", 1)).toEqual({ allowed: true });
  });

  it("should forget the guesses of someone who then gets it right", () => {
    for (let guess = 0; guess < 5; guess++) {
      recordWrongGuess("right", 0);
    }

    clearWrongGuesses("right");

    expect(checkGuessLimit("right", 1)).toEqual({ allowed: true });
  });

  it("should tell a stopped person how many minutes to wait, rounded up and at least one", () => {
    expect(tooManyGuessesMessage(10 * MINUTE)).toBe(
      "Too many wrong passwords. Try again in 10 minutes.",
    );
    expect(tooManyGuessesMessage(9 * MINUTE + 1)).toBe(
      "Too many wrong passwords. Try again in 10 minutes.",
    );
    expect(tooManyGuessesMessage(1)).toBe(
      "Too many wrong passwords. Try again in 1 minute.",
    );
  });
});
