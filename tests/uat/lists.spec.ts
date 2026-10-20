import type { Page } from "@playwright/test";
import { expect, test } from "./support/test.js";

const MASTER = "/lists/1";
const SOUNDTRACK = "/lists/3";

/** The text of every cell in a column of the list's table, by the column's heading. */
async function column(page: Page, heading: string): Promise<string[]> {
  // The position column's heading is a "#" for the eye and "Position" for a screen reader.
  const headings = (await page.locator("thead th").allInnerTexts()).map(
    (text) => (text.includes("Position") ? "Position" : text.trim()),
  );
  const index = headings.indexOf(heading);

  if (index === -1) {
    throw new Error(`No column called ${heading}`);
  }

  return page
    .locator(`tbody tr td:nth-child(${String(index + 1)})`)
    .allInnerTexts();
}

const search = (page: Page) =>
  page.getByRole("searchbox", { name: "Search this list" });
const sortHeading = (page: Page, name: string) =>
  page.getByRole("columnheader", { name, exact: true });

test.describe("the lists page", () => {
  test("shows every list with its size, and each card opens the list", async ({
    as,
  }) => {
    const page = await as("admin");

    await page.goto("/lists");

    await expect(
      page.getByRole("heading", { name: "Lists", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("8 lists")).toBeVisible();
    await expect(page.locator('main a[href^="/lists/"]')).toHaveCount(8);

    await page.getByRole("link", { name: /Best Workout Yams/ }).click();

    await expect(page).toHaveURL(/\/lists\/5$/);
    await expect(
      page.getByRole("heading", { name: "Best Workout Yams", level: 1 }),
    ).toBeVisible();
  });

  test("a card shows how much of the list the person added", async ({ as }) => {
    const page = await as("manager");

    await page.goto("/lists");

    await expect(
      page.getByRole("link", { name: /The Master List/ }),
    ).toContainText(/You added [\d,]+ \(\d+%\)/);
  });
});

test.describe("a list", () => {
  test("shows its name, size, and a page of songs with their artists and dates", async ({
    as,
  }) => {
    const page = await as("user");

    await page.goto(SOUNDTRACK);

    await expect(
      page.getByRole("heading", { name: "Best Soundtrack Yams", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/\d+ songs · created/)).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(50);
    expect((await column(page, "Added"))[0]).toMatch(
      /[A-Z][a-z]{2} \d{1,2}, \d{4}/,
    );
  });

  test("the Master List starts sorted by artist, and the others by title", async ({
    as,
  }) => {
    const page = await as("user");

    await page.goto(MASTER);
    await expect(sortHeading(page, "Artist")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(sortHeading(page, "Title")).not.toHaveAttribute(
      "aria-sort",
      /.+/,
    );

    await page.goto(SOUNDTRACK);
    await expect(sortHeading(page, "Title")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  test("only a list that shows productions has a Production column", async ({
    as,
  }) => {
    const page = await as("user");

    await page.goto(MASTER);
    await expect(sortHeading(page, "Production")).toHaveCount(0);

    await page.goto(SOUNDTRACK);
    await expect(sortHeading(page, "Production")).toBeVisible();
  });

  test("a song with several advocates shows all of them, comma separated, in Added by", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(MASTER);

    await search(page).fill("Rio");

    await expect(
      page.getByRole("row", { name: /Rio Duran Duran/ }),
    ).toContainText("Al, Chad, Minnz, Stuff");
  });
});

test.describe("searching a list", () => {
  test("finds an artist who spells a letter with a symbol by the plain letter", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(MASTER);

    await search(page).fill("short");

    await expect(page).toHaveURL(/q=short/);
    await expect(
      page.getByRole("link", { name: "Too $hort" }).first(),
    ).toBeVisible();
  });

  for (const query of ["$hort", "too short", "TOO $HORT"]) {
    test(`finds the same songs for "${query}"`, async ({ as }) => {
      const page = await as("admin");
      await page.goto(MASTER);

      await search(page).fill(query);

      await expect(
        page.getByRole("link", { name: "Too $hort" }).first(),
      ).toBeVisible();
    });
  }

  test("keeps the search in the address, so reloading shows the same songs", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(MASTER);
    await search(page).fill("short");
    await expect(page).toHaveURL(/q=short/);

    await page.reload();

    await expect(search(page)).toHaveValue("short");
    await expect(
      page.getByRole("link", { name: "Too $hort" }).first(),
    ).toBeVisible();
  });

  test("says so when nothing matches, and clearing the search brings everything back", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(SOUNDTRACK);

    await search(page).fill("zzzqqqxxx");
    await expect(page.locator("tbody tr")).toHaveCount(0);
    await expect(
      page.getByText(/no songs|0 songs|nothing/i).first(),
    ).toBeVisible();

    await search(page).fill("");

    await expect(page.locator("tbody tr")).toHaveCount(50);
  });

  test("on a list that shows productions, a production's name finds its songs too", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(SOUNDTRACK);

    await search(page).fill("Romeo");

    await expect(
      page.getByRole("link", { name: /Romeo \+ Juliet/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Garbage" }).first(),
    ).toBeVisible();
  });

  test("a search narrows the count, and the position numbers start again at 1", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(MASTER);

    await search(page).fill("short");

    await expect(
      page.getByText(/1–\d+ of \d+ songs|\d+ songs? found/).first(),
    ).toBeVisible();
    expect((await column(page, "Position"))[0]).toContain("1");
  });
});

test.describe("sorting a list", () => {
  test("by artist, ignoring a leading The: the Stones and the Stone bands are filed under S", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(MASTER);

    await search(page).fill("stone");
    await expect(page).toHaveURL(/q=stone/);
    await expect(page.getByText(/1–50 of \d+ songs/).first()).toBeVisible();

    const artistsOnPage = async () => [
      ...new Set((await column(page, "Artist")).map((text) => text.trim())),
    ];
    const inOrder = async (wanted: string[]) =>
      (await artistsOnPage()).filter((name) => wanted.includes(name));

    await expect
      .poll(() =>
        inOrder(["The Rolling Stones", "The Stone Foxes", "The Stone Roses"]),
      )
      .toEqual(["The Rolling Stones", "The Stone Foxes", "The Stone Roses"]);

    await page.getByRole("button", { name: "Next" }).first().click();
    await expect(page).toHaveURL(/page=2/);
    await expect
      .poll(() => inOrder(["Stone Sour", "Stone Temple Pilots"]))
      .toEqual(["Stone Sour", "Stone Temple Pilots"]);
  });

  test("by title, a leading article doesn't count either", async ({ as }) => {
    const page = await as("admin");
    await page.goto(`${MASTER}?sort=title&q=wind+cries`);

    await expect(
      page.getByRole("link", { name: "The Wind Cries Mary" }),
    ).toBeVisible();
  });

  test("clicking a heading sorts by it, and clicking again reverses it", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(SOUNDTRACK);

    await sortHeading(page, "Artist").getByRole("link").click();
    await expect(page).toHaveURL(/sort=artist/);
    await expect(sortHeading(page, "Artist")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    const ascending = await column(page, "Artist");

    await sortHeading(page, "Artist").getByRole("link").click();
    await expect(sortHeading(page, "Artist")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    const descending = await column(page, "Artist");

    expect(descending[0]).not.toBe(ascending[0]);
    await expect(sortHeading(page, "Title")).not.toHaveAttribute(
      "aria-sort",
      /.+/,
    );
  });

  test("by date added starts with the newest, and reverses to the oldest", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(MASTER);

    await sortHeading(page, "Added").getByRole("link").click();
    await expect(sortHeading(page, "Added")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    const newest = new Date((await column(page, "Added"))[0] ?? "").getTime();

    await sortHeading(page, "Added").getByRole("link").click();
    await expect(sortHeading(page, "Added")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    const oldest = new Date((await column(page, "Added"))[0] ?? "").getTime();

    expect(newest).toBeGreaterThan(oldest);
  });

  test("by who added it, sorting on the whole comma-separated text", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(MASTER);

    await sortHeading(page, "Added by").getByRole("link").click();

    await expect(sortHeading(page, "Added by")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    const names = await column(page, "Added by");
    const sorted = names.toSorted((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  test("by production on a list that shows them, songs with none last", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(SOUNDTRACK);

    await sortHeading(page, "Production").getByRole("link").click();
    await expect(sortHeading(page, "Production")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    const productions = (await column(page, "Production")).map((text) =>
      text.trim(),
    );
    const withProductions = productions.filter(
      (text) => text !== "–" && text !== "",
    );
    expect(withProductions.length).toBeGreaterThan(0);
  });

  test("the sort is kept when searching, and the search when sorting", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(MASTER);
    await search(page).fill("love");
    await expect(page).toHaveURL(/q=love/);

    await sortHeading(page, "Title").getByRole("link").click();

    await expect(page).toHaveURL(/q=love/);
    await expect(page).toHaveURL(/sort=title/);
    await expect(search(page)).toHaveValue("love");
  });
});

test.describe("paging through a list", () => {
  test("moves forward and back a page at a time, with the position numbers carrying on", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(SOUNDTRACK);
    const first = (await column(page, "Title"))[0];
    await expect(page.getByText(/1–50 of \d+ songs/).first()).toBeVisible();

    await page.getByRole("button", { name: "Next" }).first().click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/51–100 of \d+ songs/).first()).toBeVisible();
    expect((await column(page, "Position"))[0]).toContain("51");
    expect((await column(page, "Title"))[0]).not.toBe(first);

    await page.getByRole("button", { name: "Previous" }).first().click();

    await expect(page.getByText(/1–50 of \d+ songs/).first()).toBeVisible();
    expect((await column(page, "Title"))[0]).toBe(first);
  });

  test("can't go back from the first page, or on from the last", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto(SOUNDTRACK);
    await expect(
      page.getByRole("button", { name: "Previous" }).first(),
    ).toBeDisabled();

    await page.goto(`${SOUNDTRACK}?page=3`);

    await expect(
      page.getByRole("button", { name: "Next" }).first(),
    ).toBeDisabled();
    await expect(page.locator("tbody tr")).toHaveCount(29);
  });

  test("a page number past the end shows the last page, not an error", async ({
    as,
  }) => {
    const page = await as("admin");

    await page.goto(`${SOUNDTRACK}?page=999`);

    await expect(
      page.getByRole("heading", { name: "Best Soundtrack Yams", level: 1 }),
    ).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("a new search goes back to the first page", async ({ as }) => {
    const page = await as("admin");
    await page.goto(`${SOUNDTRACK}?page=2`);

    await search(page).fill("a");

    await expect(page).not.toHaveURL(/page=2/);
  });
});
