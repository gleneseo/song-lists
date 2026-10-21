import type { Page } from "@playwright/test";
import { idOf, navLink } from "./support/app.js";
import { expect, test } from "./support/test.js";

test.describe("staying signed in", () => {
  test("a reload keeps the person signed in", async ({ as }) => {
    const page = await as("manager");
    await page.goto("/dashboard");

    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Welcome back, Cliff" }),
    ).toBeVisible();
  });

  test("a second tab in the same browser is signed in too", async ({ as }) => {
    const first = await as("admin");
    await first.goto("/dashboard");

    const second = await first.context().newPage();
    await second.goto("/lists");

    await expect(
      second.getByRole("heading", { name: "Lists", level: 1 }),
    ).toBeVisible();
    await expect(navLink(second, "/users")).toBeVisible();
  });

  test("losing the session cookie sends the person to sign in on their next move", async ({
    as,
  }) => {
    const page = await as("user");
    await page.goto("/dashboard");

    await page.context().clearCookies();
    await page.goto("/lists");

    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("signing out in one tab signs out the other on its next move", async ({
    as,
  }) => {
    const first = await as("manager");
    await first.goto("/dashboard");
    const second = await first.context().newPage();
    await second.goto("/dashboard");

    await first.getByRole("button", { name: "C", exact: true }).click();
    await first.getByRole("menuitem", { name: "Log Out" }).click();
    await expect(first).toHaveURL(/\/sign-in$/);

    await second.goto("/lists");
    await expect(second).toHaveURL(/\/sign-in$/);
  });
});

/** Whether the page is wider than the screen, so that it scrolls sideways. */
const scrollsSideways = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the pages fit the screen: nothing makes the page itself scroll sideways", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await idOf("songs", "Hotwax");

    for (const path of [
      "/dashboard",
      "/lists",
      "/lists/1",
      "/lists/3",
      "/songs/new",
      "/users",
      `/song/${String(song)}`,
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(await scrollsSideways(page), `${path} scrolls sideways`).toBe(
        false,
      );
    }
  });

  test("a list's table scrolls within itself, so every column can still be reached", async ({
    as,
  }) => {
    const page = await as("admin");

    await page.goto("/lists/3");

    await expect(
      page.getByRole("columnheader", { name: "Title", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Artist", exact: true }),
    ).toBeVisible();
    expect(await scrollsSideways(page)).toBe(false);
  });

  test("a name still opens as a modal that fits the screen", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/lists/1?q=Hotwax");
    await expect(page.locator("tbody a[data-live]").first()).toBeVisible();

    await page.getByRole("link", { name: "Hotwax" }).first().click();

    const box = await page.getByRole("dialog").boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? -1) + (box?.width ?? 0)).toBeLessThanOrEqual(390 + 1);
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  });

  test("signing in works", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByLabel("Email").fill("judd@seed.gleneseo.com");
    await page.getByLabel("Password", { exact: true }).fill("sample-password");
    await page
      .locator("form")
      .getByRole("button", { name: "Sign In", exact: true })
      .click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
