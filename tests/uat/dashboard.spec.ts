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

  test("the buttons at the top go to the Songs page and the Add song form", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Browse songs" }).click();
    await expect(page).toHaveURL(/\/songs$/);

    await page.goto("/dashboard");
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
