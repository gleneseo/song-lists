import { describe, expect, it, vi } from "vitest";
import { openCommand, waitUntil } from "../../src/studio-launch.js";

const url = "https://local.drizzle.studio";

describe("studio launch", () => {
  it("should open a web address with open on a Mac", () => {
    expect(openCommand("darwin", url)).toEqual(["open", url]);
  });

  it("should open a web address with start on Windows", () => {
    expect(openCommand("win32", url)).toEqual(["cmd", "/c", "start", "", url]);
  });

  it("should open a web address with xdg-open everywhere else", () => {
    expect(openCommand("linux", url)).toEqual(["xdg-open", url]);
    expect(openCommand("freebsd", url)).toEqual(["xdg-open", url]);
  });

  it("should report ready as soon as the check says so, without waiting", async () => {
    const sleep = vi.fn(() => Promise.resolve());

    await expect(
      waitUntil(() => Promise.resolve(true), {
        pollMs: 100,
        giveUpAfterMs: 1000,
        sleep,
      }),
    ).resolves.toBe(true);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("should keep checking, a beat apart, until it is ready", async () => {
    const sleep = vi.fn(() => Promise.resolve());
    let checks = 0;

    await expect(
      waitUntil(() => Promise.resolve(++checks === 3), {
        pollMs: 100,
        giveUpAfterMs: 1000,
        sleep,
      }),
    ).resolves.toBe(true);
    expect(sleep.mock.calls).toEqual([[100], [100]]);
  });

  it("should give up once the time is up", async () => {
    const ready = vi.fn(() => Promise.resolve(false));

    await expect(
      waitUntil(ready, {
        pollMs: 100,
        giveUpAfterMs: 300,
        sleep: () => Promise.resolve(),
      }),
    ).resolves.toBe(false);
    expect(ready).toHaveBeenCalledTimes(3);
  });

  it("should wait in real time when it isn't given a clock", async () => {
    vi.useFakeTimers();

    try {
      let checks = 0;
      const result = waitUntil(() => Promise.resolve(++checks === 2), {
        pollMs: 50,
        giveUpAfterMs: 500,
      });

      await vi.advanceTimersByTimeAsync(50);

      await expect(result).resolves.toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
