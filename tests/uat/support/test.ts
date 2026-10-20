import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { withOwnAddress } from "./app.js";
import { PEOPLE, SEED_PASSWORD, type Role } from "./people.js";

interface Options {
  /**
   * Errors a test expects its pages to raise, as patterns: the rare test that
   * is about something known to. Anything else still fails it.
   */
  allowedErrors: RegExp[];
}

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
   * Uncaught errors in any page the test opened, and server errors (5xx) any
   * of them was answered with. Every test checks that there were none, so a
   * page that quietly breaks fails the journey it's on.
   */
  pageErrors: string[];
}

/** Notes down every uncaught error in the browser's pages, and every server error it is sent. */
function watch(context: BrowserContext, errors: string[]): void {
  context.on("weberror", (error) => {
    errors.push(error.error().message);
  });
  context.on("response", (response) => {
    if (response.status() >= 500) {
      errors.push(`${String(response.status())} from ${response.url()}`);
    }
  });
}

const test = base.extend<Fixtures & Options>({
  allowedErrors: [[], { option: true }],

  // Every browser a test opens, including the built-in one, gets its own
  // address (see `withOwnAddress`).
  context: async ({ context, pageErrors }, use) => {
    await withOwnAddress(context);
    watch(context, pageErrors);
    await use(context);
  },

  pageErrors: [
    async ({ allowedErrors }, use) => {
      const errors: string[] = [];

      await use(errors);

      const unexpected = errors.filter(
        (error) => !allowedErrors.some((allowed) => allowed.test(error)),
      );

      expect(unexpected, "uncaught errors or server errors").toEqual([]);
    },
    { auto: true },
  ],

  as: async ({ browser, baseURL, pageErrors }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];

    await use(async (role) => {
      const context = await browser.newContext();
      await withOwnAddress(context);
      watch(context, pageErrors);
      contexts.push(context);

      const response = await context.request.post("/api/auth/sign-in/email", {
        data: { email: PEOPLE[role].email, password: SEED_PASSWORD },
        headers: { Origin: new URL(baseURL ?? "").origin },
      });
      expect(response.ok(), `signing in as the ${role}`).toBe(true);

      const page = await context.newPage();

      return page;
    });

    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect, test };
