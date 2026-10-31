import type { Page } from "@playwright/test";
import {
  createPerson,
  freshEmail,
  freshName,
  signedInAs,
  signInThroughThePage,
  newPageOfTheirOwn,
  type Person,
  withDatabase,
} from "./support/app.js";
import { PEOPLE } from "./support/people.js";
import { expect, test } from "./support/test.js";

const main = (page: Page) => page.getByRole("main");

async function openPerson(page: Page, person: Person): Promise<void> {
  await page.goto(`/users/${person.id}`);
  await expect(
    main(page).getByRole("heading", { name: person.name, level: 1 }),
  ).toBeVisible();
}

const setPasswordField = (page: Page) =>
  main(page).getByRole("textbox", { name: "New password" });
const setPasswordButton = (page: Page) =>
  main(page).getByRole("button", { name: "Set", exact: true });

test.describe("the users page", () => {
  test("lists everyone with their email and role, and not the System user", async ({
    as,
  }) => {
    const page = await as("admin");

    await page.goto("/users");

    await expect(
      main(page).getByRole("heading", { name: "Users", level: 1 }),
    ).toBeVisible();
    for (const [role, person] of Object.entries(PEOPLE)) {
      const row = main(page).getByRole("link", {
        name: new RegExp(`^${person.name} ${person.email}`),
      });
      await expect(row, person.name).toBeVisible();
      await expect(row).toContainText(role === "admin" ? "admin" : role);
    }
    await expect(main(page).getByText("System", { exact: true })).toHaveCount(
      0,
    );
    await expect(main(page).getByText("system@gleneseo.com")).toHaveCount(0);
  });

  test("a person on the list opens to their own page", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/users");

    await main(page).getByRole("link", { name: /^Judd/ }).click();

    await expect(page).toHaveURL(/\/users\/[0-9a-f-]{36}$/);
    await expect(
      main(page).getByRole("heading", { name: "Judd", level: 1 }),
    ).toBeVisible();
    await expect(
      main(page).getByText(/judd@seed\.gleneseo\.com · user/),
    ).toBeVisible();
    await expect(
      main(page).getByText(/Joined [A-Z][a-z]{2} \d{1,2}, \d{4}/),
    ).toBeVisible();
  });

  test("a newly signed-up person turns up on it", async ({ as }) => {
    const person = await createPerson();
    const page = await as("admin");

    await page.goto("/users");

    await expect(
      main(page).getByRole("link", {
        name: new RegExp(`^${person.name} ${person.email}`),
      }),
    ).toBeVisible();
  });
});

test.describe("editing a person", () => {
  test("changes their name, email, role, and bio, and the page shows it", async ({
    as,
  }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);
    await main(page).getByRole("button", { name: "Edit" }).click();

    await main(page)
      .getByRole("textbox", { name: "Display name" })
      .fill("Zz Uat Renamed");
    await main(page)
      .getByRole("textbox", { name: "First name" })
      .fill("Renamed");
    await main(page).getByRole("textbox", { name: "Last name" }).fill("Person");
    await main(page)
      .getByRole("textbox", { name: "Email" })
      .fill(`renamed-${person.email}`);
    await main(page).getByRole("combobox").click();
    await page.getByRole("option", { name: "manager" }).click();
    await main(page)
      .getByRole("textbox", { name: "Bio" })
      .fill("Plays the bass.");
    await main(page).getByRole("button", { name: "Save changes" }).click();

    await expect(
      main(page).getByRole("heading", { name: "Zz Uat Renamed", level: 1 }),
    ).toBeVisible();
    await expect(
      main(page).getByText(`renamed-${person.email} · manager`),
    ).toBeVisible();
    await expect(main(page).getByText("Renamed Person")).toBeVisible();
    await expect(main(page).getByText("Plays the bass.")).toBeVisible();
  });

  test("a changed email is the one they sign in with from then on", async ({
    as,
    browser,
  }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);
    await main(page).getByRole("button", { name: "Edit" }).click();
    const moved = `moved-${person.email}`;

    await main(page).getByRole("textbox", { name: "Email" }).fill(moved);
    await main(page).getByRole("button", { name: "Save changes" }).click();
    await expect(main(page).getByText(moved)).toBeVisible();

    await signedInAs(browser, { ...person, email: moved });
  });

  test("promoting someone to manager gives them the notes form on their next visit", async ({
    as,
    browser,
  }) => {
    const person = await createPerson();
    const admin = await as("admin");
    await openPerson(admin, person);
    await main(admin).getByRole("button", { name: "Edit" }).click();
    await main(admin).getByRole("combobox").click();
    await admin.getByRole("option", { name: "manager" }).click();
    await main(admin).getByRole("button", { name: "Save changes" }).click();
    await expect(main(admin).getByText(/ · manager/)).toBeVisible();

    const theirs = await signedInAs(browser, person);
    await theirs.goto("/lists/1?q=Hotwax");
    await expect(theirs.locator("tbody a[data-live]").first()).toBeVisible();
    await theirs.getByRole("link", { name: "Hotwax" }).first().click();

    await expect(
      theirs.getByRole("dialog").getByRole("button", { name: "Edit" }),
    ).toBeVisible();
  });

  test("won't take an email another person has", async ({ as }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);
    await main(page).getByRole("button", { name: "Edit" }).click();

    await main(page)
      .getByRole("textbox", { name: "Email" })
      .fill(PEOPLE.manager.email.toUpperCase());
    await main(page).getByRole("button", { name: "Save changes" }).click();

    await expect(
      main(page).getByText(
        `Another user already has the email ${PEOPLE.manager.email}.`,
      ),
    ).toBeVisible();
    await expect(
      main(page).getByRole("heading", { name: "Edit user" }),
    ).toBeVisible();
  });

  test("won't take something that isn't an email, or a blank name", async ({
    as,
  }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);
    await main(page).getByRole("button", { name: "Edit" }).click();

    await main(page)
      .getByRole("textbox", { name: "Email" })
      .fill("not-an-email");
    await main(page).getByRole("button", { name: "Save changes" }).click();
    await expect(
      main(page).getByRole("textbox", { name: "Email" }),
    ).toHaveJSProperty("validity.typeMismatch", true);

    await main(page).getByRole("textbox", { name: "Email" }).fill(person.email);
    await main(page).getByRole("textbox", { name: "Display name" }).fill("");
    await main(page).getByRole("button", { name: "Save changes" }).click();
    await expect(
      main(page).getByRole("textbox", { name: "Display name" }),
    ).toHaveJSProperty("validity.valueMissing", true);
  });

  test("cancelling leaves the person as they were", async ({ as }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);
    await main(page).getByRole("button", { name: "Edit" }).click();
    await main(page)
      .getByRole("textbox", { name: "Display name" })
      .fill("Never saved");

    await main(page).getByRole("button", { name: "Cancel" }).click();

    await expect(
      main(page).getByRole("heading", { name: person.name, level: 1 }),
    ).toBeVisible();
  });

  test("an admin can change their own details, but not their own role", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/users");
    await main(page)
      .getByRole("link", { name: /^Al al@seed/ })
      .click();
    await expect(
      main(page).getByRole("heading", { name: "Al", level: 1 }),
    ).toBeVisible();
    // No password reset or deactivation for oneself.
    await expect(
      main(page).getByRole("heading", { name: "Reset password" }),
    ).toHaveCount(0);
    await expect(
      main(page).getByRole("button", { name: "Deactivate" }),
    ).toHaveCount(0);

    await main(page).getByRole("button", { name: "Edit" }).click();

    await expect(main(page).getByRole("combobox")).toBeDisabled();
    await expect(
      main(page).getByText("You can’t change your own role."),
    ).toBeVisible();
  });
});

test.describe("setting a new password", () => {
  test("the person signs in with it afterwards, and no longer with the old one", async ({
    as,
    browser,
  }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);

    await setPasswordField(page).fill("a brand new password");
    await setPasswordButton(page).click();

    await expect(main(page).getByText(/Password updated/)).toBeVisible();
    await signedInAs(browser, { ...person, password: "a brand new password" });

    const attempt = await newPageOfTheirOwn(browser);
    await signInThroughThePage(attempt, person.email, person.password);
    await expect(attempt.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("it ends the sessions the person already has", async ({
    as,
    browser,
  }) => {
    const person = await createPerson();
    const theirs = await signedInAs(browser, person);
    const admin = await as("admin");
    await openPerson(admin, person);

    await setPasswordField(admin).fill("another brand new password");
    await setPasswordButton(admin).click();
    await expect(main(admin).getByText(/Password updated/)).toBeVisible();

    await theirs.goto("/dashboard");
    await expect(theirs).toHaveURL(/\/sign-in$/);
  });

  test("Generate makes a password, shown so it can be passed on", async ({
    as,
  }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);
    await expect(setPasswordButton(page)).toBeDisabled();

    await main(page).getByRole("button", { name: "Generate" }).click();

    await expect(setPasswordField(page)).toHaveValue(/^\S{16}$/);
    await expect(setPasswordField(page)).toHaveJSProperty("type", "text");
    await expect(setPasswordButton(page)).toBeEnabled();
  });

  test("a password that is too short is refused, and the old one keeps working", async ({
    as,
    browser,
  }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);

    await setPasswordField(page).fill("short");
    await setPasswordButton(page).click();

    await expect(
      main(page).getByText("Password must be at least 8 characters."),
    ).toBeVisible();
    await signedInAs(browser, person);
  });
});

test.describe("deactivating a person", () => {
  test("asks to confirm first, and cancelling changes nothing", async ({
    as,
  }) => {
    const person = await createPerson();
    const page = await as("admin");
    await openPerson(page, person);

    await main(page)
      .getByRole("button", { name: "Deactivate", exact: true })
      .click();
    await expect(
      main(page).getByRole("button", { name: "Confirm deactivate" }),
    ).toBeVisible();
    await main(page).getByRole("button", { name: "Cancel" }).click();

    await expect(
      main(page).getByRole("button", { name: "Deactivate", exact: true }),
    ).toBeVisible();
    await expect(main(page).getByText("Deactivated")).toHaveCount(0);
  });

  test("signs them out, stops them signing in, and marks them on the list, until reactivated", async ({
    as,
    browser,
  }) => {
    const person = await createPerson();
    const theirs = await signedInAs(browser, person);
    const admin = await as("admin");
    await openPerson(admin, person);

    await main(admin)
      .getByRole("button", { name: "Deactivate", exact: true })
      .click();
    await main(admin)
      .getByRole("button", { name: "Confirm deactivate" })
      .click();

    await expect(main(admin).getByText(/ · Deactivated/)).toBeVisible();
    await expect(
      main(admin).getByRole("button", { name: "Reactivate" }),
    ).toBeVisible();

    // Their open session ended at once.
    await theirs.goto("/dashboard");
    await expect(theirs).toHaveURL(/\/sign-in$/);
    // And they can't start another.
    await signInThroughThePage(theirs, person.email, person.password);
    await expect(
      theirs.getByText("This account has been deactivated."),
    ).toBeVisible();
    await expect(theirs).toHaveURL(/\/sign-in$/);

    await admin.goto("/users");
    await expect(
      main(admin).getByRole("link", { name: new RegExp(`^${person.name}`) }),
    ).toContainText("Deactivated");

    await openPerson(admin, person);
    await main(admin).getByRole("button", { name: "Reactivate" }).click();
    await expect(
      main(admin).getByRole("button", { name: "Deactivate", exact: true }),
    ).toBeVisible();

    await signedInAs(browser, person);
  });

  test("their songs and history are kept", async ({ as }) => {
    const person = await createPerson();
    const admin = await as("admin");
    await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ id: number }>(
        "select id from song_lists.songs order by id limit 1",
      );
      await pool.query(
        "insert into song_lists.song_advocates (song_id, user_id, created_by, updated_by) values ($1, $2, $2, $2)",
        [rows[0]?.id, person.id],
      );
    });
    await openPerson(admin, person);

    await main(admin)
      .getByRole("button", { name: "Deactivate", exact: true })
      .click();
    await main(admin)
      .getByRole("button", { name: "Confirm deactivate" })
      .click();
    await expect(main(admin).getByText(/ · Deactivated/)).toBeVisible();

    await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ n: string }>(
        "select count(*) n from song_lists.song_advocates where user_id = $1",
        [person.id],
      );
      expect(rows[0]?.n).toBe("1");
    });
  });
});

test.describe("creating a person", () => {
  const fillIn = async (page: Page, name: string, email: string) => {
    await main(page).getByRole("textbox", { name: "Display name" }).fill(name);
    await main(page).getByRole("textbox", { name: "Email" }).fill(email);
  };

  test("the users page has a New user button that opens the form", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/users");

    await main(page).getByRole("link", { name: "New user" }).click();

    await expect(page).toHaveURL(/\/users\/new$/);
    await expect(
      main(page).getByRole("heading", { name: "New user", level: 1 }),
    ).toBeVisible();
  });

  test("makes an account that signs in with the password given, and opens its page", async ({
    as,
    browser,
  }) => {
    const name = freshName("Created");
    const email = freshEmail();
    const page = await as("admin");
    await page.goto("/users/new");

    await fillIn(page, name, email);
    await main(page)
      .getByRole("textbox", { name: "Password" })
      .fill("brand new pass");
    await main(page).getByRole("button", { name: "Create user" }).click();

    await expect(page).toHaveURL(/\/users\/[0-9a-f-]{36}$/);
    await expect(
      main(page).getByRole("heading", { name, level: 1 }),
    ).toBeVisible();
    await expect(main(page).getByText(`${email} · user`)).toBeVisible();
    const id = page.url().split("/").pop() ?? "";
    await signedInAs(browser, { id, name, email, password: "brand new pass" });
  });

  test("Generate fills in a password to pass on", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/users/new");

    await main(page).getByRole("button", { name: "Generate" }).click();

    await expect(
      main(page).getByRole("textbox", { name: "Password" }),
    ).toHaveValue(/^[A-Za-z0-9]{16}$/);
  });

  test("can make a manager", async ({ as }) => {
    const name = freshName("Boss");
    const email = freshEmail();
    const page = await as("admin");
    await page.goto("/users/new");

    await fillIn(page, name, email);
    await main(page).getByRole("combobox").click();
    await page.getByRole("option", { name: "manager" }).click();
    await main(page)
      .getByRole("textbox", { name: "Password" })
      .fill("brand new pass");
    await main(page).getByRole("button", { name: "Create user" }).click();

    await expect(main(page).getByText(`${email} · manager`)).toBeVisible();
  });

  test("says so when the email already belongs to someone, and makes nobody", async ({
    as,
  }) => {
    const person = await createPerson();
    const page = await as("admin");
    await page.goto("/users/new");

    await fillIn(page, "Zz Uat Twin", person.email.toUpperCase());
    await main(page)
      .getByRole("textbox", { name: "Password" })
      .fill("brand new pass");
    await main(page).getByRole("button", { name: "Create user" }).click();

    await expect(main(page).getByRole("alert")).toContainText(
      `Another user already has the email ${person.email}.`,
    );
    await expect(page).toHaveURL(/\/users\/new$/);
  });

  test("says so when the password is too short", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/users/new");

    await fillIn(page, freshName("Short"), freshEmail());
    await main(page).getByRole("textbox", { name: "Password" }).fill("short");
    await main(page).getByRole("button", { name: "Create user" }).click();

    await expect(main(page).getByRole("alert")).toContainText(
      "Password must be at least 8 characters.",
    );
  });
});

test.describe("creating a person, as someone who may not", () => {
  // Asking for an admin page as a non-admin answers with the not-found page,
  // and the check that runs inside a streamed section can make React report
  // error #419 ("the server could not finish this Suspense boundary") while it
  // redoes that section in the browser. Nothing shows, so the error is allowed
  // for these tests only (see "pages that aren't there" in navigation).
  test.use({
    allowedErrors: [/React error #419|could not finish this Suspense boundary/],
  });

  for (const role of ["manager", "user"] as const) {
    test(`a ${role} gets the not-found page for it`, async ({ as }) => {
      const page = await as(role);
      await page.goto("/users/new");

      await expect(
        page.getByText("This page could not be found"),
      ).toBeVisible();
    });
  }
});
