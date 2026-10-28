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
