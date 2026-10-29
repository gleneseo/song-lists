import type { Page } from "@playwright/test";
import { arrangeSong, arrangeSongDetails } from "./support/app.js";
import { expect, test } from "./support/test.js";

/** A one-pixel picture, so the browser really loads the "album art". */
const ART =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test.describe("album art beside the songs in a list", () => {
  test("a song with art shows it in its row, and a song without shows a plain tile", async ({
    as,
  }) => {
    const page = await as("user");
    const withArt = await arrangeSong();
    await arrangeSongDetails(withArt, { artworkUrl: ART, albumName: "Album" });
    const without = await arrangeSong();

    await page.goto(`/lists/1?q=${encodeURIComponent(withArt.title)}`);
    const artRow = page.locator("tbody tr", { hasText: withArt.title });
    await expect(artRow.locator("img")).toHaveAttribute("src", ART);

    await page.goto(`/lists/1?q=${encodeURIComponent(without.title)}`);
    const plainRow = page.locator("tbody tr", { hasText: without.title });
    await expect(plainRow).toBeVisible();
    await expect(plainRow.locator("img")).toHaveCount(0);
  });

  test("art that was looked for and not found leaves the plain tile", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { status: "not_found" });

    await page.goto(`/lists/1?q=${encodeURIComponent(song.title)}`);

    const row = page.locator("tbody tr", { hasText: song.title });
    await expect(row).toBeVisible();
    await expect(row.locator("img")).toHaveCount(0);
  });

  test("art that can't be loaded falls back to the plain tile, not a broken image", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      artworkUrl: "/album-art/does-not-exist.jpg",
    });

    await page.goto(`/lists/1?q=${encodeURIComponent(song.title)}`);

    const row = page.locator("tbody tr", { hasText: song.title });
    await expect(row).toBeVisible();
    await expect(row.locator("img")).toHaveCount(0);
  });
});

test.describe("album art fetched through the server", () => {
  test("the app's own images are resized and served from the app, not hotlinked", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      artworkUrl: "/album-art/aesop-rock-the-prof-in-convexed-2003.jpg",
      albumName: "Album",
    });

    await page.goto(`/lists/1?q=${encodeURIComponent(song.title)}`);

    const image = page
      .locator("tbody tr", { hasText: song.title })
      .locator("img");
    await expect(image).toHaveAttribute("src", /^\/_next\/image\?url=/);
    const response = await page.request.get(
      (await image.getAttribute("src")) ?? "",
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\//);
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });
});

test.describe("album art on the dashboard", () => {
  test("the newest songs in the catalog show their art", async ({ as }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: ART, albumName: "Album" });

    await page.goto("/dashboard");

    const entry = page
      .locator("li", { hasText: song.title })
      .filter({ has: page.locator("img") })
      .first();
    await expect(entry.locator("img")).toHaveAttribute("src", ART);
  });
});

const dialog = (page: Page) => page.getByRole("dialog");
const viewLarger = (page: Page) =>
  page.getByRole("button", { name: /View larger album art/ });
const closeLarge = (page: Page) =>
  page.getByRole("button", { name: "Close large album art" });
const closeDialog = (page: Page) =>
  page.getByRole("button", { name: "Close", exact: true });

/** One of the app's own images, which the app resizes, and which is 600 pixels across. */
const OWN_ART = "/album-art/aesop-rock-the-prof-in-convexed-2003.jpg";

async function openSongInModal(
  page: Page,
  song: { title: string },
): Promise<void> {
  await page.goto(`/lists/1?q=${encodeURIComponent(song.title)}`);
  // Names are live links only once the page is ready for them.
  await expect(page.locator("tbody a[data-live]").first()).toBeVisible();
  await page.getByRole("link", { name: song.title }).first().click();
  await expect(dialog(page)).toBeVisible();
}

/** The width of the large view, and of the picture in it. */
const viewerWidths = (page: Page) =>
  page
    .locator("[data-artwork-viewer]")
    .evaluate((viewer) => [
      viewer.getBoundingClientRect().width,
      viewer.querySelector("img")?.getBoundingClientRect().width ?? 0,
    ]);

test.describe("a song's album art, enlarged", () => {
  test("clicking the art in the modal shows it the full width of the modal, and the close button puts the song back", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      artworkUrl: OWN_ART,
      albumName: "Album",
      releaseYear: 1997,
    });
    await openSongInModal(page, song);

    await viewLarger(page).click();

    await expect(closeLarge(page)).toBeVisible();
    await expect(
      dialog(page).getByRole("heading", { name: "Album · 1997", exact: true }),
    ).toBeVisible();
    await expect(
      dialog(page).getByRole("heading", { name: song.title }),
      "the header is the album, not the song",
    ).toHaveCount(0);
    const large = dialog(page).getByRole("img", {
      name: "Album art for Album",
    });
    await expect(large).toBeVisible();
    await expect
      .poll(() =>
        large.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    const [viewer, picture] = await viewerWidths(page);
    expect(picture).toBeCloseTo(viewer ?? 0, 0);
    await expect(
      dialog(page).getByRole("link", { name: "Listen on YouTube" }),
    ).toHaveCount(0);

    await closeLarge(page).click();

    await expect(closeLarge(page)).toHaveCount(0);
    await expect(
      dialog(page).getByRole("heading", { name: song.title }),
    ).toBeVisible();
    await expect(
      dialog(page).getByRole("link", { name: "Listen on YouTube" }),
    ).toBeVisible();
    await expect(viewLarger(page)).toBeVisible();
  });

  test("the header names just the album when it has no year, and the song when it has no album name", async ({
    as,
  }) => {
    const page = await as("user");
    const noYear = await arrangeSong();
    await arrangeSongDetails(noYear, { artworkUrl: ART, albumName: "Album" });
    const noName = await arrangeSong();
    await arrangeSongDetails(noName, { artworkUrl: ART, releaseYear: 1997 });
    const bare = await arrangeSong();
    await arrangeSongDetails(bare, { artworkUrl: ART });

    await openSongInModal(page, noYear);
    await viewLarger(page).click();
    await expect(
      dialog(page).getByRole("heading", { name: "Album", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);

    await openSongInModal(page, noName);
    await viewLarger(page).click();
    await expect(
      dialog(page).getByRole("heading", { name: "1997", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);

    await openSongInModal(page, bare);
    await viewLarger(page).click();
    await expect(closeLarge(page)).toBeVisible();
    await expect(
      dialog(page).getByRole("heading", { name: bare.title }),
      "with nothing to say about the album, the song names it",
    ).toBeVisible();
  });

  test("art smaller than the modal expands to fill it", async ({ as }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: ART, albumName: "Album" });
    await openSongInModal(page, song);

    await viewLarger(page).click();

    await expect(closeLarge(page)).toBeVisible();
    const [viewer, picture] = await viewerWidths(page);
    expect(viewer).toBeGreaterThan(300);
    expect(picture).toBeCloseTo(viewer ?? 0, 0);
    const height = await dialog(page)
      .getByRole("img", { name: "Album art for Album" })
      .evaluate((image) => image.getBoundingClientRect().height);
    expect(
      height,
      "a one-pixel square, made as tall as it is wide",
    ).toBeCloseTo(picture ?? 0, 0);
  });

  test("the modal's own close button is out of the way while the art is large, and back after", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: ART, albumName: "Album" });
    await openSongInModal(page, song);
    await expect(closeDialog(page)).toBeVisible();

    await viewLarger(page).click();

    await expect(closeLarge(page)).toBeVisible();
    await expect(closeDialog(page)).toHaveCount(0);

    await closeLarge(page).click();

    await expect(closeDialog(page)).toBeVisible();
  });

  test("Escape closes the large art first, and the modal on a second press", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: ART, albumName: "Album" });
    await openSongInModal(page, song);
    await viewLarger(page).click();
    await expect(closeLarge(page)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(closeLarge(page)).toHaveCount(0);
    await expect(dialog(page)).toBeVisible();
    await expect(page).toHaveURL(/\/song\/\d+$/);

    await page.keyboard.press("Escape");

    await expect(dialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/lists\/1/);
  });

  test("it works from the keyboard: the close button has the focus, and the art gets it back", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: ART, albumName: "Album" });
    await openSongInModal(page, song);
    await viewLarger(page).focus();

    await page.keyboard.press("Enter");

    await expect(closeLarge(page)).toBeFocused();

    await page.keyboard.press("Enter");

    await expect(viewLarger(page)).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(closeLarge(page)).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(viewLarger(page)).toBeFocused();
  });

  test("a song with no art, or art that can't be loaded, has nothing to click", async ({
    as,
  }) => {
    const page = await as("user");
    const none = await arrangeSong();
    const broken = await arrangeSong();
    await arrangeSongDetails(broken, {
      artworkUrl: "/album-art/does-not-exist.jpg",
      albumName: "Album",
    });

    await openSongInModal(page, none);
    await expect(viewLarger(page)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);

    await openSongInModal(page, broken);
    await expect(
      dialog(page).getByRole("heading", { name: broken.title }),
    ).toBeVisible();
    await expect(viewLarger(page)).toHaveCount(0);
    await expect(dialog(page).getByRole("img")).toHaveCount(0);
  });

  test("the app is asked for the biggest picture it has, not one sized to the modal", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: OWN_ART, albumName: "Album" });
    await openSongInModal(page, song);
    const biggest = page.waitForRequest(
      (request) =>
        request.url().includes("/_next/image") &&
        request.url().includes("w=3840"),
    );

    await viewLarger(page).click();

    expect((await biggest).url()).toContain(encodeURIComponent(OWN_ART));
  });

  test("art that can't be loaded at the large size says so, and the close button still works", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: OWN_ART, albumName: "Album" });
    await openSongInModal(page, song);
    await page.route(/\/_next\/image\?.*w=3840/, (route) => route.abort());

    await viewLarger(page).click();

    await expect(
      dialog(page).getByText("The album art couldn\u2019t be loaded."),
    ).toBeVisible();
    await expect(dialog(page).getByRole("img")).toHaveCount(0);

    await closeLarge(page).click();

    await expect(viewLarger(page)).toBeVisible();
  });

  test("on a song's own page, it fills the page's width the same way, with the album as the page's heading", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: ART, albumName: "Album" });

    await page.goto(`/song/${String(song.id)}`);
    await viewLarger(page).click();

    await expect(closeLarge(page)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Album", level: 1, exact: true }),
    ).toBeVisible();
    const [viewer, picture] = await viewerWidths(page);
    expect(picture).toBeCloseTo(viewer ?? 0, 0);

    await closeLarge(page).click();

    await expect(closeLarge(page)).toHaveCount(0);
    await expect(viewLarger(page)).toBeVisible();
  });
});

test.describe("a song's album art, enlarged, on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("it fits inside the modal and the screen, and the modal scrolls if it is tall", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: OWN_ART, albumName: "Album" });
    await openSongInModal(page, song);

    await viewLarger(page).click();

    await expect(closeLarge(page)).toBeVisible();
    const [viewer, picture] = await viewerWidths(page);
    expect(picture).toBeCloseTo(viewer ?? 0, 0);
    expect(viewer).toBeLessThanOrEqual(390);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      "no sideways scrolling",
    ).toBeLessThanOrEqual(390);
    await closeLarge(page).click();
    await expect(viewLarger(page)).toBeVisible();
  });
});
