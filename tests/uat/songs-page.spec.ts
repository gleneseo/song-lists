import { expect, test } from "./support/test.js";

const search = (page: import("@playwright/test").Page) =>
  page.getByRole("searchbox", { name: "Search songs" });

test.describe("the Songs page", () => {
  test("lists every song in the catalog, with its artist, and says how many", async ({
    as,
  }) => {
    const page = await as("user");

    await page.goto("/songs");

    await expect(
      page.getByRole("heading", { name: "Songs", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/^([\d,]+) of \1 songs$/)).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Dillinger Four" }).first(),
    ).toBeVisible();
  });

  test("filters as you type, by title or by artist, ignoring case", async ({
    as,
  }) => {
    const page = await as("user");
    await page.goto("/songs");

    await search(page).fill("hendrix");
    await expect(page.getByText(/^[\d,]+ of [\d,]+ songs$/)).toContainText(
      "of",
    );
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: "The Jimi Hendrix Experience" })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Dillinger Four" }),
    ).toHaveCount(0);

    await search(page).fill("WIND CRIES");
    await expect(
      page.getByRole("listitem").filter({ hasText: "The Wind Cries Mary" }),
    ).toHaveCount(1);
  });

  test("finds an artist who spells a letter with a symbol by the plain letter", async ({
    as,
  }) => {
    const page = await as("user");
    await page.goto("/songs");

    await search(page).fill("too short");

    await expect(
      page.getByRole("listitem").filter({ hasText: "Too $hort" }).first(),
    ).toBeVisible();
  });

  test("clearing the filter brings the whole catalog back", async ({ as }) => {
    const page = await as("user");
    await page.goto("/songs");
    await search(page).fill("zzzqqqxxx");
    await expect(page.getByText(/^0 of [\d,]+ songs$/)).toBeVisible();

    await search(page).fill("");

    await expect(page.getByText(/^([\d,]+) of \1 songs$/)).toBeVisible();
  });

  test("has a button to add a song", async ({ as }) => {
    const page = await as("manager");
    await page.goto("/songs");

    await page.getByRole("link", { name: "+ Add Song" }).click();

    await expect(page).toHaveURL(/\/songs\/new$/);
    await expect(
      page.getByRole("heading", { name: "Add a song", level: 1 }),
    ).toBeVisible();
  });
});
