import { afterEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "../../src/rate-limiter.js";

/** A clock that only moves when a sleep is asked for. */
function fakeClock() {
  let time = 1000;
  const sleeps: number[] = [];

  return {
    sleeps,
    now: () => time,
    sleep: (ms: number) => {
      sleeps.push(ms);
      time += ms;

      return Promise.resolve();
    },
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("rate limiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should run the first task straight away", async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 500, ...clock });

    await expect(limiter.schedule(() => Promise.resolve("done"))).resolves.toBe(
      "done",
    );
    expect(clock.sleeps).toEqual([]);
  });

  it("should hold a task back until the minimum interval has passed", async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 500, ...clock });

    await limiter.schedule(() => Promise.resolve());
    clock.advance(200);
    await limiter.schedule(() => Promise.resolve());

    expect(clock.sleeps).toEqual([300]);
  });

  it("should not hold a task back when enough time has already passed", async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 500, ...clock });

    await limiter.schedule(() => Promise.resolve());
    clock.advance(900);
    await limiter.schedule(() => Promise.resolve());

    expect(clock.sleeps).toEqual([]);
  });

  it("should start tasks one at a time, in the order they were scheduled", async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 500, ...clock });
    const started: string[] = [];
    const run = (name: string) =>
      limiter.schedule(() => {
        started.push(name);

        return Promise.resolve(name);
      });

    const results = await Promise.all([run("a"), run("b"), run("c")]);

    expect(results).toEqual(["a", "b", "c"]);
    expect(started).toEqual(["a", "b", "c"]);
    expect(clock.sleeps).toEqual([500, 500]);
  });

  it("should not let a failing task hold up the ones after it", async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 500, ...clock });

    const failing = limiter.schedule(() => Promise.reject(new Error("boom")));
    const after = limiter.schedule(() => Promise.resolve("still ran"));

    await expect(failing).rejects.toThrow("boom");
    await expect(after).resolves.toBe("still ran");
  });

  it("should wait in real time when it isn't given a clock", async () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ minIntervalMs: 50 });
    const second = vi.fn(() => Promise.resolve());

    await limiter.schedule(() => Promise.resolve());
    const pending = limiter.schedule(second);

    await vi.advanceTimersByTimeAsync(10);
    expect(second).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    await pending;
    expect(second).toHaveBeenCalledOnce();
  });
});
