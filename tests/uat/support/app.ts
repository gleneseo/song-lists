import { randomBytes } from "node:crypto";
import type { BrowserContext, Locator, Page } from "@playwright/test";
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

export {
  freshEmail,
  freshName,
  freshWord,
  navLink,
  signInThroughThePage,
  signUpThroughThePage,
  withDatabase,
  withOwnAddress,
};
