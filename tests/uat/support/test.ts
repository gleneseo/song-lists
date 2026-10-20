import { test as base, expect, type Page } from "@playwright/test";
import { withOwnAddress } from "./app.js";
import { statePath, type Role } from "./people.js";

interface Fixtures {
  /**
   * A new page, already signed in as the seeded person with that role -- a
   * browser of its own, so signing in as another role in the same test
   * doesn't disturb it.
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

  as: async ({ browser, pageErrors }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];

    await use(async (role) => {
      const context = await browser.newContext({
        storageState: statePath(role),
      });
      await withOwnAddress(context);
      const page = await context.newPage();

      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });
      contexts.push(context);

      return page;
    });

    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect, test };
