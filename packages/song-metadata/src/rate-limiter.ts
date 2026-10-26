interface RateLimiterOptions {
  /** The fewest milliseconds allowed between the starts of two tasks. */
  minIntervalMs: number;
  /** The current time in milliseconds; replaceable so tests need not wait. */
  now?: () => number;
  /** Waits that long; replaceable so tests need not wait. */
  sleep?: (ms: number) => Promise<void>;
}

interface RateLimiter {
  /**
   * Runs the task once earlier tasks have started and the minimum interval
   * since the last one has passed. Tasks start in the order they were
   * scheduled, and one that fails doesn't hold up the rest.
   */
  schedule<T>(task: () => Promise<T>): Promise<T>;
}

/**
 * Spaces out calls to an outside service, so many songs being added at once
 * can't turn into a burst of requests it would turn away.
 *
 * The spacing holds within one running process; separate processes (the web
 * server and a backfill, say) each keep their own.
 */
function createRateLimiter({
  minIntervalMs,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: RateLimiterOptions): RateLimiter {
  let tail: Promise<unknown> = Promise.resolve();
  let lastStart: number | null = null;

  const waitForTurn = async () => {
    if (lastStart !== null) {
      const remaining = lastStart + minIntervalMs - now();

      if (remaining > 0) {
        await sleep(remaining);
      }
    }

    lastStart = now();
  };

  return {
    schedule<T>(task: () => Promise<T>): Promise<T> {
      const result = tail.then(waitForTurn).then(task);

      tail = result.catch(() => undefined);

      return result;
    },
  };
}

export { createRateLimiter };
export type { RateLimiter, RateLimiterOptions };
