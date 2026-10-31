import type { Page } from "@playwright/test";
import { freshName, idOf, withDatabase } from "./support/app.js";
import { expect, test } from "./support/test.js";

const main = (page: Page) => page.getByRole("main");

/** A list of this test's own, made straight in the database. */
async function arrangeList(name: string, songs = 0): Promise<number> {
  return withDatabase(async (pool) => {
    const { rows: people } = await pool.query<{ id: string }>(
      "select id from song_lists.users where name = 'Al'",
    );
    const al = people[0]?.id;
    const { rows } = await pool.query<{ id: number }>(
      "insert into song_lists.lists (name, created_by, updated_by) values ($1, $2, $2) returning id",
      [name, al],
    );
    const id = rows[0]?.id ?? -1;

    await pool.query(
      `insert into song_lists.list_songs (list_id, song_id, created_by, updated_by)
       select $1, id, $2, $2 from song_lists.songs order by id limit $3`,
      [id, al, songs],
    );

    return id;
  });
}

async function listNamed(
  name: string,
): Promise<{ id: number; extra: string[] } | null> {
  return withDatabase(async (pool) => {
    const { rows } = await pool.query<{ id: number; extra: string[] }>(
      "select id, extra_columns extra from song_lists.lists where name = $1",
      [name],
    );

    return rows[0] ?? null;
  });
}

test.describe("the manage lists page", () => {
  test("shows every list with its size, from a button on the lists page", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/lists");

    await main(page).getByRole("link", { name: "Manage lists" }).click();

    await expect(page).toHaveURL(/\/admin\/lists$/);
    await expect(
      main(page).getByRole("heading", { name: "Manage lists", level: 1 }),
    ).toBeVisible();
    await expect(
      main(page).getByRole("link", { name: /^The Master List \d/ }),
    ).toBeVisible();
  });
});

test.describe("admin list pages that are not there for this visitor", () => {
  // Asking for an admin page as a non-admin answers with the not-found page,
  // and the check that runs inside a streamed section can make React report
  // error #419 ("the server could not finish this Suspense boundary") while it
  // redoes that section in the browser. Nothing shows, so the error is allowed
  // for these tests only (see "pages that aren't there" in navigation).
  test.use({
    allowedErrors: [/React error #419|could not finish this Suspense boundary/],
  });

  for (const role of ["manager", "user"] as const) {
    test(`a ${role} has no Manage lists button and gets the not-found page`, async ({
      as,
    }) => {
      const page = await as(role);
      await page.goto("/lists");
      await expect(
        main(page).getByRole("link", { name: "Manage lists" }),
      ).toHaveCount(0);

      for (const path of [
        "/admin/lists",
        "/admin/lists/new",
        "/admin/lists/1",
      ]) {
        await page.goto(path);
        await expect(
          page.getByText("This page could not be found"),
          path,
        ).toBeVisible();
      }
    });
  }

  test("an unknown list is a page that isn't there", async ({ as }) => {
    const page = await as("admin");

    await page.goto("/admin/lists/999999");

    await expect(page.getByText("This page could not be found")).toBeVisible();
  });
});

test.describe("creating a list", () => {
  test("makes it, turns up on the manage page and the lists page, and opens empty", async ({
    as,
  }) => {
    const name = freshName("List");
    const page = await as("admin");
    await page.goto("/admin/lists");

    await main(page).getByRole("link", { name: "New list" }).click();
    await main(page).getByRole("textbox", { name: "Name" }).fill(name);
    await main(page).getByRole("button", { name: "Create list" }).click();

    await expect(page).toHaveURL(/\/admin\/lists$/);
    await expect(
      main(page).getByRole("link", { name: `${name} 0 songs` }),
    ).toBeVisible();
    await page.goto("/lists");
    await main(page)
      .getByRole("link", { name: new RegExp(`^${name}`) })
      .click();
    await expect(
      main(page).getByRole("heading", { name, level: 1 }),
    ).toBeVisible();
  });

  test("can turn on the Productions column", async ({ as }) => {
    const name = freshName("List");
    const page = await as("admin");
    await page.goto("/admin/lists/new");

    await main(page).getByRole("textbox", { name: "Name" }).fill(name);
    await main(page)
      .getByRole("checkbox", { name: "Show a Productions column" })
      .check();
    await main(page).getByRole("button", { name: "Create list" }).click();

    await expect(page).toHaveURL(/\/admin\/lists$/);
    expect((await listNamed(name))?.extra).toEqual(["productions"]);
  });

  test("says so when another list has the name, in any case", async ({
    as,
  }) => {
    const name = freshName("List");
    await arrangeList(name);
    const page = await as("admin");
    await page.goto("/admin/lists/new");

    await main(page)
      .getByRole("textbox", { name: "Name" })
      .fill(name.toUpperCase());
    await main(page).getByRole("button", { name: "Create list" }).click();

    await expect(main(page).getByRole("alert")).toContainText(
      `There is already a list named ${name.toUpperCase()}.`,
    );
  });
});

test.describe("editing a list", () => {
  test("renames it and the new name shows everywhere", async ({ as }) => {
    const name = freshName("List");
    const id = await arrangeList(name);
    const renamed = `${name} Renamed`;
    const page = await as("admin");
    await page.goto(`/admin/lists/${String(id)}`);

    await main(page).getByRole("textbox", { name: "Name" }).fill(renamed);
    await main(page).getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/admin\/lists$/);
    await expect(
      main(page).getByRole("link", { name: new RegExp(`^${renamed}`) }),
    ).toBeVisible();
    await page.goto(`/lists/${String(id)}`);
    await expect(
      main(page).getByRole("heading", { name: renamed, level: 1 }),
    ).toBeVisible();
  });

  test("the Master List can't be renamed or deleted", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/admin/lists/1");

    await expect(
      main(page).getByRole("textbox", { name: "Name" }),
    ).toBeDisabled();
    await expect(
      main(page).getByRole("button", { name: "Delete", exact: true }),
    ).toHaveCount(0);
  });
});

test.describe("deleting a list", () => {
  test("asks first, and Cancel delete keeps the list", async ({ as }) => {
    const id = await arrangeList(freshName("List"));
    const page = await as("admin");
    await page.goto(`/admin/lists/${String(id)}`);

    await main(page)
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await main(page).getByRole("button", { name: "Cancel delete" }).click();

    await expect(
      main(page).getByRole("button", { name: "Delete", exact: true }),
    ).toBeVisible();
    await page.goto(`/lists/${String(id)}`);
    await expect(main(page).getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("removes the list, takes its songs off it, and keeps the songs", async ({
    as,
  }) => {
    const name = freshName("List");
    const id = await arrangeList(name, 3);
    const page = await as("admin");
    await page.goto(`/admin/lists/${String(id)}`);
    await expect(
      main(page).getByText(/takes 3 songs off the list/),
    ).toBeVisible();

    await main(page)
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await main(page).getByRole("button", { name: "Confirm delete" }).click();

    await expect(page).toHaveURL(/\/admin\/lists$/);
    await expect(main(page).getByRole("link", { name })).toHaveCount(0);
    await page.goto(`/lists/${String(id)}`);
    await expect(page.getByText("This page could not be found")).toBeVisible();
    expect(await idOf("songs", "Hotwax")).toBeGreaterThan(0);
  });
});
