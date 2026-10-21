import type { Page } from "@playwright/test";
import { idOf } from "./support/app.js";
import { expect, test } from "./support/test.js";

const dialog = (page: Page) => page.getByRole("dialog");

test.describe("a song's own page", () => {
  test("shows everything the modal does: what it covers, its notes, its lists, who championed it", async ({
    as,
  }) => {
    const page = await as("user");
    const id = await idOf("songs", "Me And The Devil Blues", "Cowboy Junkies");

    await page.goto(`/song/${String(id)}`);

    await expect(
      page.getByRole("heading", { name: "Me And The Devil Blues", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Cowboy Junkies" }),
    ).toBeVisible();
    await expect(page.getByText("Cover of")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Robert Johnson" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "On these lists", level: 3 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Championed by", level: 3 }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  });

  test("an admin has the Edit button on it", async ({ as }) => {
    const page = await as("admin");
    const id = await idOf("songs", "Hotwax");

    await page.goto(`/song/${String(id)}`);

    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  });

  test("a link on it to another name opens that in a modal, and closing returns to the song", async ({
    as,
  }) => {
    const page = await as("user");
    const id = await idOf("songs", "Hotwax");
    await page.goto(`/song/${String(id)}`);
    await expect(page.locator("main a[data-live]").first()).toBeVisible();

    await page.getByRole("link", { name: "Beck" }).click();
    await expect(
      dialog(page).getByRole("heading", { name: "Beck", level: 2 }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/song/${String(id)}$`));
  });
});

test.describe("an artist's own page", () => {
  test("lists their songs, and where the songs are listed", async ({ as }) => {
    const page = await as("user");
    const id = await idOf("artists", "Beck");

    await page.goto(`/artist/${String(id)}`);

    await expect(
      page.getByRole("heading", { name: "Beck", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/\d+ songs/).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Songs", level: 3 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Hotwax" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "On these lists", level: 3 }),
    ).toBeVisible();
  });

  test("shows a song that covers another with what it covers", async ({
    as,
  }) => {
    const page = await as("user");
    const id = await idOf("artists", "Cowboy Junkies");

    await page.goto(`/artist/${String(id)}`);

    await expect(page.getByText(/Cover of/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Robert Johnson" }),
    ).toBeVisible();
  });

  test("shows the songs they are featured on", async ({ as }) => {
    const page = await as("user");
    const id = await idOf("artists", "Beck");

    await page.goto(`/artist/${String(id)}`);

    await expect(page.getByText(/featured on \d+/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Featured on", level: 3 }),
    ).toBeVisible();
  });
});

test.describe("a production's own page", () => {
  test("shows its type and year, its songs, and the lists they are on", async ({
    as,
  }) => {
    const page = await as("user");
    const id = await idOf("productions", "Heavy Metal");

    await page.goto(`/production/${String(id)}`);

    await expect(
      page.getByRole("heading", { name: "Heavy Metal", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/Film · 1981/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Heavy Metal - Take A Ride" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Don Felder" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "On these lists", level: 3 }),
    ).toBeVisible();
  });
});
