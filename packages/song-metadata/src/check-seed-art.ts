import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { migrationsFolder } from "@song-lists/db/migrate";
import {
  artChecks,
  checkAddress,
  seedArtwork,
  type AddressOutcome,
} from "./seed-art.js";

/**
 * How many are asked at once of each service. The Cover Art Archive is a
 * small service on borrowed hosting, so it is asked gently; iTunes's own
 * image servers can take much more.
 */
const CONCURRENCY = { coverartarchive: 3, other: 16 };
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 15_000;

/** The seed migration whose file name ends this way, read as text. */
function seedMigration(ending: string): string {
  const file = readdirSync(migrationsFolder).find((name) =>
    name.endsWith(ending),
  );

  if (!file) {
    throw new Error(`No migration ends in ${ending}.`);
  }

  return readFileSync(path.join(migrationsFolder, file), "utf8");
}

/** Runs `work` on every item, never more than `limit` at a time. */
async function inBatches<T>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];

  await Promise.all(
    Array.from({ length: limit }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        await work(item);
      }
    }),
  );
}

/**
 * Asks about every cover the seeded songs show, the way the app asks for
 * it, and lists the ones that don't load: addresses at a service that
 * answer with an error (some of them only now and then), and files of ours
 * that aren't there. Nothing is changed. Exits with 1 when something is
 * broken or missing, so it can stand guard, though it needs the network and
 * so isn't part of the build.
 */
async function main(): Promise<void> {
  const root = path.resolve(migrationsFolder, "../../..");
  const ownFiles = path.join(root, "apps/web-next/public");
  const artwork = seedArtwork(
    seedMigration("_seed_artists_and_songs.sql"),
    seedMigration("_seed_song_details.sql"),
  );
  const usedBy = new Map<string, string[]>();
  const missing = new Map<string, string[]>();

  for (const { songTitle, albumName, artworkUrl } of artwork) {
    const who = `${songTitle} (${albumName})`;

    for (const check of artChecks(artworkUrl)) {
      const where = check.kind === "file" ? missing : usedBy;
      const key = check.kind === "file" ? check.path : check.address;

      if (check.kind === "file" && existsSync(path.join(ownFiles, key))) {
        continue;
      }

      where.set(key, [...(where.get(key) ?? []), who]);
    }
  }

  console.log(
    `Checking ${String(usedBy.size)} cover addresses for ${String(artwork.length)} seeded songs...`,
  );

  const outcomes = new Map<string, AddressOutcome>();
  const sleep = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

  const addresses = [...usedBy.keys()];
  let done = 0;
  const check = async (address: string) => {
    outcomes.set(
      address,
      await checkAddress(address, {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }),
        attempts: ATTEMPTS,
        sleep,
        retryDelayMs: RETRY_DELAY_MS,
      }),
    );
    done += 1;

    if (done % 500 === 0) {
      console.log(
        `  ${String(done)} of ${String(addresses.length)} checked...`,
      );
    }
  };
  const archive = addresses.filter((address) =>
    address.includes("coverartarchive.org"),
  );

  await Promise.all([
    inBatches(archive, CONCURRENCY.coverartarchive, check),
    inBatches(
      addresses.filter((address) => !archive.includes(address)),
      CONCURRENCY.other,
      check,
    ),
  ]);

  const listed = (status: AddressOutcome["status"]) =>
    [...outcomes].filter(([, outcome]) => outcome.status === status);
  const broken = listed("broken");
  const flaky = listed("flaky");

  for (const [address, outcome] of broken) {
    console.log(
      `\nBROKEN  ${address}\n  ${outcome.status === "broken" ? outcome.reason : ""}`,
    );
    console.log(`  used by: ${(usedBy.get(address) ?? []).join("; ")}`);
  }

  for (const [address, who] of missing) {
    console.log(`\nMISSING FILE  ${address}\n  used by: ${who.join("; ")}`);
  }

  for (const [address] of flaky) {
    console.log(`\nFLAKY  ${address}\n  answered only after a retry`);
  }

  console.log(
    `\n${String(outcomes.size - broken.length - flaky.length)} ok, ${String(flaky.length)} flaky, ${String(broken.length)} broken, ${String(missing.size)} missing files.`,
  );

  process.exitCode = broken.length > 0 || missing.size > 0 ? 1 : 0;
}

await main();
