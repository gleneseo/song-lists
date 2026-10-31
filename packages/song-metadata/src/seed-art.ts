import { artworkUrlAtSize, largestArtworkUrl } from "./artwork.js";

/** A seeded song's album details, as far as its cover art goes. */
interface SeedArtwork {
  songTitle: string;
  albumName: string;
  /** What the details row holds: a web address, or a path to one of the app's own files. */
  artworkUrl: string;
}

/** One thing that has to load for a cover to show: a file of ours, or a web address. */
type ArtCheck =
  { kind: "file"; path: string } | { kind: "web"; address: string };

/** How one web address fared: fine, fine after a retry (so only unreliable), or never. */
type AddressOutcome =
  | { status: "ok" }
  | { status: "flaky"; attempts: number }
  | { status: "broken"; reason: string };

/** The width of the biggest of the art's smaller sizes: the details view asks for twice its 112 pixels. */
const SMALL_ART_PIXELS = 224;

/** Where the app keeps its own images, as the address they are served at. */
const OWN_ART_PREFIX = "/album-art/";

/** One value in a SQL `VALUES` row: a quoted string, in which `''` is a quote, or `NULL`. */
const SQL_TEXT = "(?:'(?:[^']|'')*'|NULL)";

/** A SQL string's own text. */
function unquote(value: string): string {
  return value.slice(1, -1).replaceAll("''", "'");
}

/** The text between the `INSERT` into a table and the end of its `VALUES` list. */
function insertBlock(sql: string, table: string): string {
  const start = sql.indexOf(`INSERT INTO "song_lists"."${table}"`);
  const end = sql.indexOf(") AS v(", start);

  return start === -1 || end === -1 ? "" : sql.slice(start, end);
}

/** Every seeded song's title, by the ID that other seed rows name it by. */
function seedSongTitles(songsSql: string): Map<string, string> {
  const titles = new Map<string, string>();
  const row = /^\t\(\d+, '([0-9a-f-]{36})', ('(?:[^']|'')*'), /gm;

  for (const [, id, title] of insertBlock(songsSql, "songs").matchAll(row)) {
    titles.set(String(id), unquote(String(title)));
  }

  return titles;
}

/**
 * The cover art every seeded song's album details name, read from the seed
 * migrations' text: the one that seeds the songs, and the one that seeds
 * their details. A song with details but no art is left out.
 */
function seedArtwork(songsSql: string, detailsSql: string): SeedArtwork[] {
  const titles = seedSongTitles(songsSql);
  const row = new RegExp(
    `^\\t\\(\\d+, '[0-9a-f-]{36}', 'matched', ${SQL_TEXT}, ${SQL_TEXT}, (${SQL_TEXT}), ('(?:[^']|'')*'|NULL), ${SQL_TEXT}, ${SQL_TEXT}, ${SQL_TEXT}, ${SQL_TEXT}, '([0-9a-f-]{36})'\\)`,
    "gm",
  );
  const found: SeedArtwork[] = [];

  for (const [, art, album, songId] of insertBlock(
    detailsSql,
    "song_metadata",
  ).matchAll(row)) {
    if (art === undefined || art === "NULL") {
      continue;
    }

    found.push({
      songTitle: titles.get(String(songId)) ?? String(songId),
      albumName: album === undefined || album === "NULL" ? "" : unquote(album),
      artworkUrl: unquote(art),
    });
  }

  return found;
}

/**
 * What has to load for a cover to show, as the app asks for it: a file of
 * ours has to be there; a service's art has to come at the small size the
 * song's page and lists use and at the biggest size the large view asks
 * for (see `artworkUrlAtSize` and `largestArtworkUrl`).
 */
function artChecks(artworkUrl: string): ArtCheck[] {
  if (artworkUrl.startsWith(OWN_ART_PREFIX)) {
    return [{ kind: "file", path: artworkUrl }];
  }

  return [
    ...new Set([
      artworkUrlAtSize(artworkUrl, SMALL_ART_PIXELS),
      largestArtworkUrl(artworkUrl),
    ]),
  ].map((address) => ({ kind: "web", address }));
}

interface CheckAddressOptions {
  fetch: typeof globalThis.fetch;
  /** How many times to try before calling an address broken. */
  attempts: number;
  /** Waits before another try, so that a service having a bad moment gets one. */
  sleep: (milliseconds: number) => Promise<void>;
  retryDelayMs: number;
}

/**
 * Asks about an address until it answers with an image, up to `attempts`
 * times, without downloading the image. One that fails and then answers is `flaky`: it may show for some
 * and not for others. One that never answers is `broken`.
 */
async function checkAddress(
  address: string,
  { fetch, attempts, sleep, retryDelayMs }: CheckAddressOptions,
): Promise<AddressOutcome> {
  let reason = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(address, {
        method: "HEAD",
        redirect: "follow",
      });

      if (
        response.ok &&
        response.headers.get("content-type")?.startsWith("image/")
      ) {
        return attempt === 1
          ? { status: "ok" }
          : { status: "flaky", attempts: attempt };
      }

      reason = response.ok
        ? "an answer that isn't an image"
        : `HTTP ${String(response.status)}`;
    } catch (error) {
      reason = error instanceof Error ? error.message : "no answer";
    }

    if (attempt < attempts) {
      await sleep(retryDelayMs);
    }
  }

  return { status: "broken", reason };
}

export { artChecks, checkAddress, seedArtwork, seedSongTitles };
export type { AddressOutcome, ArtCheck, CheckAddressOptions, SeedArtwork };
