/** The command and arguments that open a web address on the given platform. */
function openCommand(
  platform: NodeJS.Platform,
  url: string,
): [command: string, ...args: string[]] {
  switch (platform) {
    case "darwin":
      return ["open", url];
    case "win32":
      return ["cmd", "/c", "start", "", url];
    default:
      return ["xdg-open", url];
  }
}

interface WaitOptions {
  /** How long to leave between checks. */
  pollMs: number;
  /** How long to keep checking before giving up. */
  giveUpAfterMs: number;
  /** Replaceable so tests need not wait. */
  sleep?: (ms: number) => Promise<void>;
}

/** Checks until `ready` says yes, or the time is up; says which happened. */
async function waitUntil(
  ready: () => Promise<boolean>,
  {
    pollMs,
    giveUpAfterMs,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  }: WaitOptions,
): Promise<boolean> {
  for (let waited = 0; waited < giveUpAfterMs; waited += pollMs) {
    if (await ready()) {
      return true;
    }

    await sleep(pollMs);
  }

  return false;
}

export { openCommand, waitUntil };
export type { WaitOptions };
