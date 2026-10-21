import { spawn } from "node:child_process";
import { connect } from "node:net";
import { openCommand, waitUntil } from "./studio-launch.js";

/** Drizzle Studio's own default, so its web page needs no port to find it. */
const PORT = 4983;
/** Kept to this machine: Studio can edit rows, and its own default is every network interface. */
const HOST = "127.0.0.1";
const STUDIO_URL = "https://local.drizzle.studio";
const POLL_MS = 250;
const GIVE_UP_AFTER_MS = 30_000;

const isListening = (): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = connect({ host: HOST, port: PORT });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });

/** Hands the address to whatever this machine opens web pages with. */
function openInBrowser(url: string): void {
  const [command, ...args] = openCommand(process.platform, url);

  spawn(command, args, { stdio: "ignore", detached: true })
    .on("error", () => {
      console.log(`Couldn't open a browser; go to ${url} yourself.`);
    })
    .unref();
}

/**
 * Starts Drizzle Studio on this machine only and opens it in the browser once
 * it's ready, which `drizzle-kit studio` itself has no option for. Stopping
 * this (Ctrl-C) stops Studio too.
 */
async function main(): Promise<void> {
  if (await isListening()) {
    throw new Error(
      `Something is already listening on port ${String(PORT)}, probably another Drizzle Studio. Stop it, or open ${STUDIO_URL} to use it.`,
    );
  }

  const studio = spawn(
    "npx",
    ["drizzle-kit", "studio", "--host", HOST, "--port", String(PORT)],
    { stdio: "inherit", shell: process.platform === "win32" },
  );

  studio.once("exit", (code) => {
    process.exit(code ?? 1);
  });
  process.once("exit", () => {
    studio.kill();
  });

  if (
    await waitUntil(isListening, {
      pollMs: POLL_MS,
      giveUpAfterMs: GIVE_UP_AFTER_MS,
    })
  ) {
    openInBrowser(STUDIO_URL);
  } else {
    console.log(`Studio didn't start in time; try ${STUDIO_URL} in a moment.`);
  }
}

await main();
