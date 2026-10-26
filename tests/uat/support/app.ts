import { randomBytes } from "node:crypto";
import {
  request,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { Pool } from "pg";
import { SEED_PASSWORD } from "./people.js";

/** A link in the top bar, found by where it goes: the bar's links are styled as buttons. */
const navLink = (page: Page, href: string): Locator =>
  page.locator(`nav a[href="${href}"]`);

/**
 * Gives a browser its own address, as far as the app can tell. The app's
 * production build rate-limits sign-ins and sign-ups by address -- a few every
 * ten seconds -- and every test here arrives from the same machine, so without
 * this they would take turns being refused.
 */
async function withOwnAddress(context: BrowserContext): Promise<void> {
  const [a = 0, b = 0, c = 0] = randomBytes(3);

  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${String(a)}.${String(b)}.${String(c)}`,
  });
}

/** A word of letters only, different every time, written in our house style ("Qkzmw"). */
const freshWord = (): string => {
  const letters = Array.from(randomBytes(5), (byte) =>
    String.fromCharCode(97 + (byte % 26)),
  ).join("");

  return letters.charAt(0).toUpperCase() + letters.slice(1);
};

/** A name that no earlier test could have used, in our house style: "Zz Uat Band Qkzmw". */
const freshName = (prefix: string): string => `Zz Uat ${prefix} ${freshWord()}`;

/** An email nobody has signed up with. */
const freshEmail = (): string =>
  `uat-${randomBytes(6).toString("hex")}@example.com`;

/** Signs in through the sign-in page, the way a person would. */
async function signInThroughThePage(
  page: Page,
  email: string,
  password: string = SEED_PASSWORD,
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .locator("form")
    .getByRole("button", { name: "Sign In", exact: true })
    .click();
}

/** Signs up through the sign-up page, the way a person would. */
async function signUpThroughThePage(
  page: Page,
  details: { name: string; email: string; password: string },
): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(details.name);
  await page.getByLabel("Email").fill(details.email);
  await page.getByLabel("Password", { exact: true }).fill(details.password);
  await page
    .locator("form")
    .getByRole("button", { name: "Sign Up", exact: true })
    .click();
}

/**
 * Runs `use` with a pool on the app's own database, for arranging or checking
 * what a journey can't reach through the pages (such as promoting someone to
 * manager, or reading back what was saved).
 */
async function withDatabase<T>(use: (pool: Pool) => Promise<T>): Promise<T> {
  const connectionString = process.env["UAT_DATABASE_URL"];

  if (!connectionString) {
    throw new Error("UAT_DATABASE_URL isn't set; is the global setup running?");
  }

  const pool = new Pool({ connectionString });

  try {
    return await use(pool);
  } finally {
    await pool.end();
  }
}

/** A song, and the artist who made it, that nothing else in the data depends on. */
interface ArrangedSong {
  id: number;
  title: string;
  artist: string;
  artistId: number;
}

/**
 * Puts a new song (by a new artist, on the Master List) straight into the
 * database, for a journey that edits it -- so it never has to change one of
 * the seeded songs the other journeys look at.
 */
async function arrangeSong(
  details: { bio?: string; list?: string; sameArtistAs?: ArrangedSong } = {},
): Promise<ArrangedSong> {
  const artist = details.sameArtistAs?.artist ?? freshName("Band");
  const title = freshName("Song");

  return withDatabase(async (pool) => {
    const { rows: people } = await pool.query<{ id: string }>(
      "select id from song_lists.users where name = 'Al'",
    );
    const al = people[0]?.id;
    const artistId =
      details.sameArtistAs?.artistId ??
      (
        await pool.query<{ id: number }>(
          "insert into song_lists.artists (name, created_by, updated_by) values ($1, $2, $2) returning id",
          [artist, al],
        )
      ).rows[0]?.id;
    const { rows: songs } = await pool.query<{ id: number }>(
      "insert into song_lists.songs (title, artist_id, bio, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
      [title, artistId, details.bio ?? null, al],
    );
    await pool.query(
      `insert into song_lists.list_songs (list_id, song_id, created_by, updated_by)
       select id, $1, $2, $2 from song_lists.lists where name = $3`,
      [songs[0]?.id, al, details.list ?? "The Master List"],
    );

    return {
      id: songs[0]?.id ?? 0,
      title,
      artist,
      artistId: artistId ?? 0,
    };
  });
}

/**
 * Records what the automatic lookup found (or didn't) for an arranged song,
 * straight in the database -- the browser tests never call out to iTunes, so
 * this is how a song gets its art, album, and year.
 */
async function arrangeSongDetails(
  song: ArrangedSong,
  details: {
    status?: "matched" | "not_found" | "error";
    source?: "itunes" | "musicbrainz" | null;
    artworkUrl?: string | null;
    albumName?: string | null;
    releaseYear?: number | null;
  } = {},
): Promise<void> {
  const status = details.status ?? "matched";
  const matched = status === "matched";

  await withDatabase(async (pool) => {
    await pool.query(
      `insert into song_lists.song_metadata
         (song_id, status, source, artwork_url, album_name, release_year, matched_by, fetched_at, created_by, updated_by)
       select $1, $2, $3, $4, $5, $6, 'auto', now(), id, id
       from song_lists.users where name = 'Al'`,
      [
        song.id,
        status,
        matched && details.source !== null
          ? (details.source ?? "itunes")
          : null,
        matched ? (details.artworkUrl ?? null) : null,
        matched ? (details.albumName ?? null) : null,
        matched ? (details.releaseYear ?? null) : null,
      ],
    );
  });
}

/** The ID of the one row with this name, in one of the catalog's tables. */
async function idOf(
  table: "artists" | "songs" | "productions",
  name: string,
  artist?: string,
): Promise<number> {
  const column = table === "songs" ? "title" : "name";

  return withDatabase(async (pool) => {
    const { rows } = await pool.query<{ id: number }>(
      table === "songs" && artist !== undefined
        ? `select s.id from song_lists.songs s join song_lists.artists a on a.id = s.artist_id
           where s.title = $1 and a.name = $2`
        : `select id from song_lists.${table} where ${column} = $1`,
      artist === undefined ? [name] : [name, artist],
    );

    if (rows.length !== 1 || rows[0] === undefined) {
      throw new Error(
        `Expected one ${table} row named ${name}, found ${String(rows.length)}`,
      );
    }

    return rows[0].id;
  });
}

/** A person who has signed up through the app, with a password of their own. */
interface Person {
  id: string;
  name: string;
  email: string;
  password: string;
}

/**
 * Signs somebody up the way the sign-up page does, from an address of their
 * own, so a journey that manages or deactivates them touches nobody else.
 */
async function createPerson(
  name: string = freshName("Person"),
): Promise<Person> {
  const baseURL = `http://127.0.0.1:${process.env["UAT_PORT"] ?? "3100"}`;
  const [a = 0, b = 0, c = 0] = randomBytes(3);
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Origin: baseURL,
      "x-forwarded-for": `10.${String(a)}.${String(b)}.${String(c)}`,
    },
  });
  const person = {
    name,
    email: freshEmail(),
    password: "a long enough password",
  };

  try {
    const response = await api.post("/api/auth/sign-up/email", {
      data: person,
    });
    const body = (await response.json()) as { user: { id: string } };

    return { id: body.user.id, ...person };
  } finally {
    await api.dispose();
  }
}

/**
 * A browser of their own, signed in through the sign-in page the way a
 * person would, as someone from {@link createPerson}. Each call has its own
 * address, so several sign-ins in a test never trip the rate limit.
 */
async function signedInAs(browser: Browser, person: Person): Promise<Page> {
  const page = await newPageOfTheirOwn(browser);
  await signInThroughThePage(page, person.email, person.password);
  await page.waitForURL(/\/dashboard$/);

  return page;
}

/** A page in a browser context with an address of its own, signed in as nobody. */
async function newPageOfTheirOwn(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  await withOwnAddress(context);

  return context.newPage();
}

export {
  arrangeSong,
  arrangeSongDetails,
  newPageOfTheirOwn,
  signedInAs,
  createPerson,
  freshEmail,
  freshName,
  idOf,
  freshWord,
  navLink,
  signInThroughThePage,
  signUpThroughThePage,
  withDatabase,
  withOwnAddress,
};
export type { ArrangedSong, Person };
