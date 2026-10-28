import { arrangeSong } from "./support/app.js";
import { PEOPLE } from "./support/people.js";
import { expect, test } from "./support/test.js";

test.describe("the dashboard", () => {
  for (const role of ["admin", "manager", "user"] as const) {
    test(`greets ${role} by name, with their figures and their lists`, async ({
      as,
    }) => {
      const page = await as(role);

      await page.goto("/dashboard");

      await expect(
        page.getByRole("heading", {
          name: `Welcome back, ${PEOPLE[role].name}`,
          level: 1,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Songs added", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("List additions", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Contributor rank", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Browse lists" }).getByRole("link"),
      ).toHaveCount(9); // the eight lists, and View all lists
    });
  }

  test("an admin's numbers add up with the catalog: their share is the biggest", async ({
    as,
  }) => {
    const page = await as("admin");

    await page.goto("/dashboard");

    await expect(page.getByText("#1", { exact: true })).toBeVisible();
    await expect(page.getByText("of 9 contributors")).toBeVisible();
  });

  test("ranks the contributors, and marks the person looking as 'you'", async ({
    as,
  }) => {
    const page = await as("manager");

    await page.goto("/dashboard");

    const ranking = page.getByRole("list", {
      name: "Contributors ranked by songs added",
    });
    await expect(ranking.getByRole("listitem")).toHaveCount(9);
    await expect(ranking.getByRole("listitem").first()).toContainText("Al");
    await expect(ranking.locator('[aria-current="true"]')).toContainText(
      "Cliff",
    );
    await expect(ranking.locator('[aria-current="true"]')).toContainText(
      "(you)",
    );
  });

  test("shows the person's own recent additions, newest first, each linking on", async ({
    as,
  }) => {
    const page = await as("admin");

    await page.goto("/dashboard");

    const history = page.getByRole("list", {
      name: "Songs you added, newest first",
    });
    await expect(history.getByRole("listitem").first()).toBeVisible();
    await expect(
      history.getByRole("listitem").first().getByRole("link").first(),
    ).toHaveAttribute("href", /\/song\/\d+$/);
  });

  test("a person with nothing added yet has a dashboard that still works", async ({
    as,
  }) => {
    const page = await as("user");

    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Welcome back, Judd" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Browse lists" }),
    ).toBeVisible();
  });

  test("has a song of the day, and a card for the newest songs in the catalog", async ({
    as,
  }) => {
    const page = await as("admin");

    await page.goto("/dashboard");

    await expect(page.getByText("Song of the day")).toBeVisible();
    await expect(
      page.getByText("A fresh pick from the catalog every day"),
    ).toBeVisible();
    await expect(page.getByText("Top contributors")).toBeVisible();
  });

  test("the Latest card lists the 100 newest songs on The Master List, not songs on other lists", async ({
    as,
  }) => {
    const page = await as("user");
    const onMaster = await arrangeSong();
    const elsewhere = await arrangeSong({ list: "Best Soundtrack Yams" });

    await page.goto("/dashboard");

    const latest = page.getByRole("list", {
      name: "Newest songs on The Master List, newest first",
    });
    await expect(latest.getByText(onMaster.title)).toBeVisible();
    await expect(latest.getByText(elsewhere.title)).toHaveCount(0);
    await expect(latest.getByRole("listitem")).toHaveCount(100);
    await expect(
      page.getByText("The 100 newest songs on The Master List"),
    ).toBeVisible();
  });

  test("the Latest and contributors cards are the same set height, and scroll", async ({
    as,
  }) => {
    const page = await as("user");

    await page.goto("/dashboard");

    const latest = page.getByRole("list", {
      name: "Newest songs on The Master List, newest first",
    });
    const contributors = page.getByRole("list", {
      name: "Contributors ranked by songs added",
    });
    const card = (list: typeof latest) =>
      list.locator("xpath=ancestor::*[@data-slot='card']");
    await expect(latest.getByRole("listitem")).toHaveCount(100);

    const [latestBox, contributorsBox] = await Promise.all([
      card(latest).boundingBox(),
      card(contributors).boundingBox(),
    ]);
    expect(latestBox?.height).toBeCloseTo(contributorsBox?.height ?? -1, 0);
    expect(
      await latest.evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    expect(await latest.evaluate((el) => getComputedStyle(el).overflowY)).toBe(
      "auto",
    );
    // Both lists are a set 300 px tall, however many people or songs there are.
    expect(await latest.evaluate((el) => el.clientHeight)).toBe(300);
    expect(
      await contributors.evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    expect(await contributors.evaluate((el) => el.clientHeight)).toBe(300);
  });

  test("the button at the top goes to the Add song form", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "Browse songs" })).toHaveCount(
      0,
    );
    await page.getByRole("link", { name: "Add song" }).click();
    await expect(page).toHaveURL(/\/songs\/new$/);
  });

  test("each list card opens that list, and View all lists opens the lists page", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/dashboard");

    await page
      .getByRole("region", { name: "Browse lists" })
      .getByRole("link", { name: /Best Love Ballads/ })
      .click();
    await expect(page).toHaveURL(/\/lists\/6$/);

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "View all lists" }).click();
    await expect(page).toHaveURL(/\/lists$/);
  });
});
