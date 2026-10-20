import { navLink } from "./support/app.js";
import { PEOPLE } from "./support/people.js";
import { expect, test } from "./support/test.js";

const LIST_NAMES = [
  "The Master List",
  "On A Boat!",
  "Best Soundtrack Yams",
  "Best Cover Songs",
  "Best Workout Yams",
  "Best Love Ballads",
  "Best Songs About Doing It, Uh Huh-Huh",
  "Getting Lit",
];

test.describe("the top bar", () => {
  test("an admin sees every link, including Users", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/dashboard");

    for (const href of ["/dashboard", "/songs", "/users"]) {
      await expect(navLink(page, href).first(), href).toBeVisible();
    }
    await expect(
      page.locator("nav").getByRole("button", { name: "Lists" }),
    ).toBeVisible();
  });

  for (const role of ["manager", "user"] as const) {
    test(`a ${role} sees the same links but not Users`, async ({ as }) => {
      const page = await as(role);
      await page.goto("/dashboard");

      for (const href of ["/dashboard", "/songs"]) {
        await expect(navLink(page, href).first(), href).toBeVisible();
      }
      await expect(navLink(page, "/users")).toHaveCount(0);
    });
  }

  test("each link goes where it says", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/dashboard");

    await navLink(page, "/songs").click();
    await expect(page).toHaveURL(/\/songs$/);
    await expect(
      page.getByRole("heading", { name: "Songs", level: 1 }),
    ).toBeVisible();

    await navLink(page, "/users").click();
    await expect(page).toHaveURL(/\/users$/);
    await expect(
      page.getByRole("heading", { name: "Users", level: 1 }),
    ).toBeVisible();

    await navLink(page, "/dashboard").first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the name on the left goes to the dashboard when signed in", async ({
    as,
  }) => {
    const page = await as("user");
    await page.goto("/songs");

    await page.getByRole("link", { name: "Song Lists" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the account menu shows who is signed in, with a way to log out", async ({
    as,
  }) => {
    const page = await as("manager");
    await page.goto("/dashboard");

    await page
      .getByRole("button", { name: PEOPLE.manager.name.charAt(0), exact: true })
      .click();

    await expect(
      page.getByText(PEOPLE.manager.name, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(PEOPLE.manager.email)).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Log Out" })).toBeVisible();
  });
});

test.describe("the Lists menu", () => {
  test("hovering Lists shows every list, and choosing one goes there", async ({
    as,
  }) => {
    const page = await as("user");
    await page.goto("/dashboard");

    await page.locator("nav").getByRole("button", { name: "Lists" }).hover();

    await expect(
      page.getByRole("menuitem", { name: "All lists" }),
    ).toBeVisible();
    for (const name of LIST_NAMES) {
      await expect(
        page.getByRole("menuitem", { name, exact: true }),
        name,
      ).toBeVisible();
    }

    await page.getByRole("menuitem", { name: "Best Cover Songs" }).click();

    await expect(page).toHaveURL(/\/lists\/4$/);
    await expect(
      page.getByRole("heading", { name: "Best Cover Songs", level: 1 }),
    ).toBeVisible();
  });

  test("All lists goes to the lists page", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/songs");

    await page.locator("nav").getByRole("button", { name: "Lists" }).hover();
    await page.getByRole("menuitem", { name: "All lists" }).click();

    await expect(page).toHaveURL(/\/lists$/);
  });

  test("the menu closes again once the pointer leaves it", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/dashboard");

    await page.locator("nav").getByRole("button", { name: "Lists" }).hover();
    await expect(
      page.getByRole("menuitem", { name: "All lists" }),
    ).toBeVisible();

    await page.mouse.move(600, 500);

    await expect(
      page.getByRole("menuitem", { name: "All lists" }),
    ).toBeHidden();
  });
});

test.describe("pages that aren't there", () => {
  // Asking for a page that doesn't exist sometimes makes React report error
  // #419 ("the server could not finish this Suspense boundary"): the check
  // that it's missing runs inside a streamed section, which React then has to
  // redo in the browser. Nothing shows, and the not-found page still appears,
  // so the error is allowed here -- and only here.
  test.use({
    allowedErrors: [/React error #419|could not finish this Suspense boundary/],
  });

  test("an unknown address shows the not-found page", async ({ as }) => {
    const page = await as("user");
    await page.goto("/no-such-page");

    await expect(page.getByText("This page could not be found")).toBeVisible();
  });

  for (const path of [
    "/lists/999999",
    "/lists/not-a-number",
    "/song/999999",
    "/artist/999999",
    "/production/999999",
  ]) {
    test(`${path} shows the not-found page`, async ({ as }) => {
      const page = await as("admin");
      await page.goto(path);

      await expect(
        page.getByText("This page could not be found"),
      ).toBeVisible();
    });
  }

  for (const role of ["manager", "user"] as const) {
    test(`the users page doesn't reveal itself to a ${role}: it looks like a page that isn't there`, async ({
      as,
    }) => {
      const page = await as(role);
      await page.goto("/users");

      await expect(
        page.getByText("This page could not be found"),
      ).toBeVisible();
    });

    test(`a ${role} can't open another person's account page either`, async ({
      as,
    }) => {
      const page = await as(role);
      await page.goto("/users/2067c2e2-d71f-4d93-98b3-caefeefa81c1");
    });
  }
});
