import { test as base, expect, type Page } from "@playwright/test";
import { withOwnAddress } from "./app.js";
import { PEOPLE, SEED_PASSWORD, type Role } from "./people.js";

interface Fixtures {
  /**
   * A new page, already signed in as the seeded person with that role. It is
   * a browser of its own with a session of its own, signed in afresh each
   * time: so signing in as another role in the same test doesn't disturb it,
   * and a test that logs out (or whose person is deactivated or has their
   * password reset) can't sign anyone else's test out.
   */
  as: (role: Role) => Promise<Page>;
  /**
   * Uncaught errors in any page the test opened. Every test checks that
   * there were none, so a page that quietly breaks fails the journey it's on.
   */
  pageErrors: string[];
}

const test = base.extend<Fixtures>({
  // Every browser a test opens, including the built-in one, gets its own
  // address (see `withOwnAddress`).
  context: async ({ context }, use) => {
    await withOwnAddress(context);
    await use(context);
  },

  pageErrors: [
    // Playwright needs the first argument written as a destructuring pattern,
    // even when, as here, there is nothing in it to use.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const errors: string[] = [];

      await use(errors);

      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],

  as: async ({ browser, baseURL, pageErrors }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];

    await use(async (role) => {
      const context = await browser.newContext();
      await withOwnAddress(context);
      contexts.push(context);

      const response = await context.request.post("/api/auth/sign-in/email", {
        data: { email: PEOPLE[role].email, password: SEED_PASSWORD },
        headers: { Origin: new URL(baseURL ?? "").origin },
      });
      expect(response.ok(), `signing in as the ${role}`).toBe(true);

      const page = await context.newPage();

      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });

      return page;
    });

    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect, test };
