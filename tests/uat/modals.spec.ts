import type { Locator, Page } from "@playwright/test";
import { arrangeSong, arrangeSongDetails } from "./support/app.js";
import { expect, test } from "./support/test.js";

const dialog = (page: Page) => page.getByRole("dialog");

/** How many entries the browser's history holds, so a test can tell a push from a replace. */
const historyLength = (page: Page) =>
  page.evaluate(() => navigation.entries().length);

/** Marks the page, so a later check can tell whether it was replaced by a full page load. */
const markPage = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as Record<string, unknown>)["__uat"] = true;
  });
const stillTheSamePage = (page: Page) =>
  page.evaluate(
    () => (window as unknown as Record<string, unknown>)["__uat"] === true,
  );

async function openListPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  // Names are live links only once the page is ready for them.
  await expect(page.locator("tbody a[data-live]").first()).toBeVisible();
}

test.describe("opening a name from a list", () => {
  test("a song title opens the song in a modal over the list, not as a new page", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/1?q=Me+And+The+Devil");
    await markPage(page);

    await page
      .getByRole("link", { name: "Me And The Devil Blues" })
      .first()
      .click();

    await expect(dialog(page)).toBeVisible();
    await expect(
      dialog(page).getByRole("heading", {
        name: "Me And The Devil Blues",
        level: 2,
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/song\/\d+$/);
    expect(await stillTheSamePage(page), "the page wasn't reloaded").toBe(true);
    // The list is still there behind it.
    await expect(page.locator("main h1")).toHaveText("The Master List");
  });

  test("an artist's name opens that artist, with their songs", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/1?q=Hotwax");
    await markPage(page);

    await page.getByRole("link", { name: "Beck" }).first().click();

    await expect(
      dialog(page).getByRole("heading", { name: "Beck", level: 2 }),
    ).toBeVisible();
    await expect(
      dialog(page)
        .getByText(/\d+ songs/)
        .first(),
    ).toBeVisible();
    await expect(
      dialog(page).getByRole("link", { name: "Hotwax" }),
    ).toBeVisible();
    expect(await stillTheSamePage(page)).toBe(true);
  });

  test("a production's name opens that production, with its songs and the lists they are on", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/3");
    await markPage(page);

    await page.locator('tbody a[href^="/production/"]').first().click();

    await expect(
      dialog(page)
        .getByText(/Film|Television|Stage/)
        .first(),
    ).toBeVisible();
    await expect(
      dialog(page).getByRole("heading", { name: "Songs", level: 3 }),
    ).toBeVisible();
    await expect(
      dialog(page).getByRole("heading", { name: "On these lists", level: 3 }),
    ).toBeVisible();
    expect(await stillTheSamePage(page)).toBe(true);
  });

  test("a song shows what it covers, its notes, its lists, and who championed it", async ({
    as,
  }) => {
    const page = await as("user");
    await openListPage(page, "/lists/1?q=Me+And+The+Devil");

    await page
      .getByRole("link", { name: "Me And The Devil Blues" })
      .first()
      .click();

    const modal = dialog(page);
    await expect(modal.getByText("Cover of")).toBeVisible();
    await expect(
      modal.getByRole("link", { name: "Robert Johnson" }),
    ).toBeVisible();
    await expect(
      modal.getByRole("heading", { name: "Notes", level: 3 }),
    ).toBeVisible();
    await expect(modal.getByText("Talk Hard! -Cliff")).toBeVisible();
    await expect(
      modal.getByRole("link", { name: "The Master List" }),
    ).toBeVisible();
    await expect(
      modal.getByRole("heading", { name: "Championed by", level: 3 }),
    ).toBeVisible();
    await expect(modal.getByText(/Cliff since/)).toBeVisible();
    await expect(modal.getByText(/Added to the catalog/)).toBeVisible();
  });

  test("a song in a film shows the film as a link that opens it", async ({
    as,
  }) => {
    const page = await as("user");
    await openListPage(page, "/lists/1?q=Take+A+Ride");
    await page
      .getByRole("link", { name: "Heavy Metal - Take A Ride" })
      .first()
      .click();

    await dialog(page)
      .getByRole("link", { name: /Heavy Metal \(1981\)|Heavy Metal/ })
      .first()
      .click();

    await expect(dialog(page).getByText(/Film · 1981/)).toBeVisible();
    await expect(
      dialog(page).getByRole("link", { name: "Heavy Metal - Take A Ride" }),
    ).toBeVisible();
  });
});

test.describe("moving between modals", () => {
  test("a link inside a modal replaces it, rather than stacking another", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/1?q=Me+And+The+Devil");
    await page
      .getByRole("link", { name: "Me And The Devil Blues" })
      .first()
      .click();
    await expect(dialog(page)).toBeVisible();
    const entries = await historyLength(page);
    await markPage(page);

    await dialog(page).getByRole("link", { name: "Robert Johnson" }).click();

    await expect(
      dialog(page).getByRole("heading", { name: "Robert Johnson", level: 2 }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/artist\/\d+$/);
    expect(await historyLength(page), "history entries").toBe(entries);
    expect(await stillTheSamePage(page), "the page wasn't reloaded").toBe(true);
  });

  test("however many modals deep, one close returns to the list", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/1?q=Me+And+The+Devil");
    await page
      .getByRole("link", { name: "Me And The Devil Blues" })
      .first()
      .click();
    await dialog(page).getByRole("link", { name: "Robert Johnson" }).click();
    await expect(
      dialog(page).getByRole("heading", { name: "Robert Johnson", level: 2 }),
    ).toBeVisible();
    await dialog(page)
      .getByRole("link", { name: "Me And The Devil Blues" })
      .first()
      .click();
    await expect(
      dialog(page).getByRole("heading", {
        name: "Me And The Devil Blues",
        level: 2,
      }),
    ).toBeVisible();

    await dialog(page).getByRole("button", { name: "Close" }).click();

    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/\/lists\/1\?q=Me\+And\+The\+Devil$/);
  });
});

test.describe("closing a modal", () => {
  for (const [how, close] of [
    [
      "the Close button",
      (page: Page) =>
        dialog(page).getByRole("button", { name: "Close" }).click(),
    ],
    ["the Escape key", (page: Page) => page.keyboard.press("Escape")],
    ["a click outside it", (page: Page) => page.mouse.click(5, 400)],
    ["the browser's back button", (page: Page) => page.goBack()],
  ] as const) {
    test(`with ${how} returns to the list, keeping its search, sort, and page`, async ({
      as,
    }) => {
      const page = await as("admin");
      await openListPage(page, "/lists/3?sort=artist&page=2");
      const list = page.url();
      await page.locator('tbody a[href^="/song/"]').first().click();
      await expect(dialog(page)).toBeVisible();

      await close(page);

      await expect(dialog(page)).toBeHidden();
      await expect(page).toHaveURL(list);
    });
  }

  test("the browser's forward button opens the same modal again", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/3");
    await page.locator('tbody a[href^="/song/"]').first().click();
    await expect(dialog(page)).toBeVisible();
    const opened = page.url();

    await page.goBack();
    await expect(dialog(page)).toBeHidden();
    await page.goForward();

    await expect(dialog(page)).toBeVisible();
    await expect(page).toHaveURL(opened);
  });
});

test.describe("opening one directly", () => {
  test("loading a song's address gives its full page, not a modal", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/1?q=Hotwax");
    const href = await page
      .getByRole("link", { name: "Hotwax" })
      .first()
      .getAttribute("href");

    await page.goto(href ?? "");

    await expect(dialog(page)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Hotwax", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Beck" })).toBeVisible();
  });

  test("refreshing while a modal is open shows that song's full page", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/1?q=Hotwax");
    await page.getByRole("link", { name: "Hotwax" }).first().click();
    await expect(dialog(page)).toBeVisible();

    await page.reload();

    await expect(dialog(page)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Hotwax", level: 1 }),
    ).toBeVisible();
  });

  test("on a full page, a link to another name opens it in a modal over the page", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/song/2");
    await expect(page.locator("main a[data-live]").first()).toBeVisible();

    await page.locator('main a[href^="/artist/"]').first().click();

    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/\/song\/2$/);
  });

  test("a modified click opens the name in a new tab as a full page, as a link should", async ({
    as,
  }) => {
    const page = await as("admin");
    await openListPage(page, "/lists/1?q=Hotwax");

    const [newTab] = await Promise.all([
      page.context().waitForEvent("page"),
      page
        .getByRole("link", { name: "Hotwax" })
        .first()
        .click({ modifiers: ["ControlOrMeta"] }),
    ]);
    await newTab.waitForLoadState();

    await expect(newTab).toHaveURL(/\/song\/\d+$/);
    await expect(
      newTab.getByRole("heading", { name: "Hotwax", level: 1 }),
    ).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);
  });
});

test.describe("clicking a name before the page is ready", () => {
  /** Holds back the page's scripts, so there's time to click before React has taken over. */
  async function slowScripts(page: Page, ms: number): Promise<void> {
    await page.route("**/_next/static/**/*.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      await route.continue();
    });
  }

  test("a title clicked on the list while scripts are still loading opens the modal once they have", async ({
    as,
  }) => {
    const page = await as("admin");
    await slowScripts(page, 2500);

    await page.goto("/lists/1?q=Hotwax", { waitUntil: "domcontentloaded" });
    await markPage(page);
    const title = page.getByRole("link", { name: "Hotwax" }).first();
    await expect(title).toBeVisible();
    await expect(title).not.toHaveAttribute("data-live", "");
    await title.click();

    await expect(dialog(page)).toBeVisible({ timeout: 20_000 });
    await expect(
      dialog(page).getByRole("heading", { name: "Hotwax", level: 2 }),
    ).toBeVisible();
    expect(await stillTheSamePage(page), "the page wasn't reloaded").toBe(true);
  });

  test("an artist's name clicked on the dashboard early opens the modal too", async ({
    as,
  }) => {
    const page = await as("admin");
    await slowScripts(page, 2500);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await markPage(page);
    const artist = page.locator('main a[href^="/artist/"]').first();
    await expect(artist).toBeVisible();
    await artist.click();

    await expect(dialog(page)).toBeVisible({ timeout: 20_000 });
    expect(await stillTheSamePage(page), "the page wasn't reloaded").toBe(true);
  });

  test("a modified click early still opens a new tab", async ({ as }) => {
    const page = await as("admin");
    await slowScripts(page, 2500);
    await page.goto("/lists/1?q=Hotwax", { waitUntil: "domcontentloaded" });
    const title = page.getByRole("link", { name: "Hotwax" }).first();
    await expect(title).toBeVisible();

    const [newTab] = await Promise.all([
      page.context().waitForEvent("page"),
      title.click({ modifiers: ["ControlOrMeta"] }),
    ]);

    await expect(newTab).toHaveURL(/\/song\/\d+$/, { timeout: 20_000 });
  });
});

test.describe("names around the app", () => {
  test("the dashboard's recent songs and song of the day open in modals", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/dashboard");
    await expect(page.locator("main a[data-live]").first()).toBeVisible();

    await page
      .getByRole("list", { name: "Songs you added, newest first" })
      .getByRole("link")
      .first()
      .click();

    await expect(dialog(page)).toBeVisible();
    await expect(page).toHaveURL(/\/song\/\d+$/);
  });
});

/** An image the app serves itself, standing in for art hosted by iTunes. */
const ownArtwork = `http://127.0.0.1:${process.env["UAT_PORT"] ?? "3100"}/apple-icon.png`;

const artwork = (page: Page | Locator) =>
  page.getByRole("img", { name: /Album art/ });
const youtubeLink = (page: Page | Locator) =>
  page.getByRole("link", { name: "Listen on YouTube" });

async function openSongInModal(
  page: Page,
  song: { title: string },
): Promise<void> {
  await openListPage(page, `/lists/1?q=${encodeURIComponent(song.title)}`);
  await page.getByRole("link", { name: song.title }).first().click();
  await expect(dialog(page)).toBeVisible();
}

test.describe("a song's art, album, and where to hear it", () => {
  test("a song that was looked up shows its art, album, and year", async ({
    as,
  }) => {
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      artworkUrl: ownArtwork,
      albumName: "The Acceptance Album",
      releaseYear: 1997,
    });
    const page = await as("user");

    await openSongInModal(page, song);

    const modal = dialog(page);
    await expect(
      modal.getByRole("img", { name: "Album art for The Acceptance Album" }),
    ).toBeVisible();
    await expect(modal.getByText("The Acceptance Album · 1997")).toBeVisible();
    await expect(modal.getByText(/Album details via iTunes/)).toBeVisible();
    expect(
      await modal
        .getByRole("img")
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
      "the art actually loaded",
    ).toBeGreaterThan(0);
  });

  test("a song found on MusicBrainz credits it and the Cover Art Archive", async ({
    as,
  }) => {
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      source: "musicbrainz",
      artworkUrl: ownArtwork,
      albumName: "The Acceptance Album",
      releaseYear: 1997,
    });
    const page = await as("user");

    await openSongInModal(page, song);

    await expect(
      dialog(page).getByText(
        /Album details via MusicBrainz and the Cover Art Archive/,
      ),
    ).toBeVisible();
  });

  test("details set by hand credit no one", async ({ as }) => {
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      source: null,
      albumName: "The Acceptance Album",
      releaseYear: 1997,
    });
    const page = await as("user");

    await openSongInModal(page, song);

    const modal = dialog(page);
    await expect(modal.getByText("The Acceptance Album · 1997")).toBeVisible();
    await expect(modal.getByText(/Album details via/)).toHaveCount(0);
    await expect(modal.getByText(/Added to the catalog/)).toBeVisible();
  });

  test("the full page shows them too", async ({ as }) => {
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      artworkUrl: ownArtwork,
      albumName: "The Acceptance Album",
      releaseYear: 1997,
    });
    const page = await as("user");

    await page.goto(`/song/${String(song.id)}`);

    await expect(artwork(page)).toBeVisible();
    await expect(page.getByText("The Acceptance Album · 1997")).toBeVisible();
    await expect(youtubeLink(page)).toBeVisible();
  });

  test("a song that was looked up shows only the year when the album is unknown", async ({
    as,
  }) => {
    const song = await arrangeSong();
    await arrangeSongDetails(song, { artworkUrl: null, releaseYear: 1981 });
    const page = await as("user");

    await openSongInModal(page, song);

    await expect(artwork(dialog(page))).toHaveCount(0);
    await expect(dialog(page).getByText("1981", { exact: true })).toBeVisible();
  });

  test("a link to hear it on YouTube opens a search for the song in a new tab", async ({
    as,
  }) => {
    const song = await arrangeSong();
    const page = await as("user");

    await openSongInModal(page, song);

    const link = youtubeLink(dialog(page));
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    const href = new URL((await link.getAttribute("href")) ?? "");
    expect(href.origin + href.pathname).toBe("https://www.youtube.com/results");
    expect(href.searchParams.get("search_query")).toBe(
      `${song.artist} ${song.title}`,
    );
  });

  test("a song nothing was found for shows no art or album, but still the YouTube link", async ({
    as,
  }) => {
    const song = await arrangeSong();
    await arrangeSongDetails(song, { status: "not_found" });
    const page = await as("user");

    await openSongInModal(page, song);

    await expect(artwork(dialog(page))).toHaveCount(0);
    await expect(dialog(page).getByText(/via iTunes/)).toHaveCount(0);
    await expect(youtubeLink(dialog(page))).toBeVisible();
  });

  test("a song that was never looked up looks just the same", async ({
    as,
  }) => {
    const song = await arrangeSong();
    const page = await as("user");

    await openSongInModal(page, song);

    await expect(artwork(dialog(page))).toHaveCount(0);
    await expect(youtubeLink(dialog(page))).toBeVisible();
  });

  test("art that can't be loaded leaves nothing behind, and the rest of the song still shows", async ({
    as,
  }) => {
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      artworkUrl: `${ownArtwork}.missing`,
      albumName: "The Lost Album",
      releaseYear: 1997,
    });
    const page = await as("user");

    await openSongInModal(page, song);

    await expect(artwork(dialog(page))).toHaveCount(0);
    await expect(dialog(page).getByText("The Lost Album · 1997")).toBeVisible();
    await expect(
      dialog(page).getByRole("heading", { name: song.title, level: 2 }),
    ).toBeVisible();
  });
});
