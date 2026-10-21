import type { Page } from "@playwright/test";
import {
  createPerson,
  newPageOfTheirOwn,
  signedInAs,
  signInThroughThePage,
} from "./support/app.js";
import { expect, test } from "./support/test.js";

const main = (page: Page) => page.getByRole("main");

const OLD_PASSWORD = "a long enough password";
const NEW_PASSWORD = "a different long password";

const emailForm = (page: Page) =>
  main(page).getByRole("region", { name: "Email address" });
const passwordForm = (page: Page) =>
  main(page).getByRole("region", { name: "Password" });

/** Fills the email form and submits it. */
async function changeEmail(
  page: Page,
  newEmail: string,
  password: string = OLD_PASSWORD,
): Promise<void> {
  await emailForm(page).getByLabel("New email address").fill(newEmail);
  await emailForm(page)
    .getByLabel("Current password", { exact: true })
    .fill(password);
  await emailForm(page).getByRole("button", { name: "Change email" }).click();
}

/** Fills the password form and submits it. */
async function changePassword(
  page: Page,
  details: { current?: string; next?: string; confirm?: string },
): Promise<void> {
  const next = details.next ?? NEW_PASSWORD;

  await passwordForm(page)
    .getByLabel("Current password", { exact: true })
    .fill(details.current ?? OLD_PASSWORD);
  await passwordForm(page)
    .getByLabel("New password", { exact: true })
    .fill(next);
  await passwordForm(page)
    .getByLabel("Confirm new password")
    .fill(details.confirm ?? next);
  await passwordForm(page)
    .getByRole("button", { name: "Change password" })
    .click();
}

test.describe("reaching the account page", () => {
  for (const role of ["admin", "manager", "user"] as const) {
    test(`a ${role} opens it from the menu under their initial`, async ({
      as,
    }) => {
      const page = await as(role);
      await page.goto("/dashboard");

      await page.getByRole("button", { name: /^[A-Z]$/ }).click();
      await page.getByRole("menuitem", { name: "Account" }).click();

      await expect(page).toHaveURL(/\/account$/);
      await expect(
        page.getByRole("heading", { name: "Your account", level: 1 }),
      ).toBeVisible();
      await expect(emailForm(page)).toBeVisible();
      await expect(passwordForm(page)).toBeVisible();
    });
  }

  test("it says who is signed in and what their email address is now", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);

    await page.goto("/account");

    await expect(
      main(page).getByText(`Signed in as ${person.name}`),
    ).toBeVisible();
    await expect(emailForm(page).getByText(person.email)).toBeVisible();
  });

  test("opened directly while signed out, it sends them to sign in", async ({
    page,
  }) => {
    await page.goto("/account");

    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test.describe("changing the email address", () => {
  test("the new address signs them in, and the old one no longer does", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");
    const newEmail = `moved-${person.email}`;

    await changeEmail(page, newEmail);

    await expect(
      emailForm(page).getByText(/email address has been changed/i),
    ).toBeVisible();
    await expect(emailForm(page).getByText(newEmail)).toBeVisible();
    await expect(emailForm(page).getByLabel("New email address")).toHaveValue(
      "",
    );

    const withNew = await newPageOfTheirOwn(browser);
    await signInThroughThePage(withNew, newEmail, OLD_PASSWORD);
    await expect(withNew).toHaveURL(/\/dashboard$/);

    const withOld = await newPageOfTheirOwn(browser);
    await signInThroughThePage(withOld, person.email, OLD_PASSWORD);
    await expect(withOld.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("they stay signed in on the page they changed it on", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changeEmail(page, `kept-${person.email}`);
    await expect(
      emailForm(page).getByText(/email address has been changed/i),
    ).toBeVisible();
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the wrong current password is refused, and the address stays as it was", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changeEmail(page, `nope-${person.email}`, "not my password");

    await expect(
      emailForm(page)
        .getByRole("alert")
        .filter({ hasText: /current password/ }),
    ).toBeVisible();
    await page.reload();
    await expect(emailForm(page).getByText(person.email)).toBeVisible();
  });

  test("an address someone else has is refused, however it is capitalized", async ({
    browser,
  }) => {
    const person = await createPerson();
    const other = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changeEmail(page, other.email.toUpperCase());

    await expect(
      emailForm(page).getByText(/another account already uses that email/i),
    ).toBeVisible();
  });

  test("something that isn't an email address is refused", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changeEmail(page, "a@b");

    await expect(
      emailForm(page).getByText("Enter a valid email address."),
    ).toBeVisible();
  });

  test("the password box can show what was typed, as on the sign-in page", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");
    const box = emailForm(page).getByLabel("Current password", { exact: true });

    await emailForm(page)
      .getByRole("button", { name: "Show password" })
      .click();

    await expect(box).toHaveJSProperty("type", "text");
  });
});

test.describe("coming back to the account page", () => {
  test("nothing from the last visit is left on it after signing out and in again", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");
    await changeEmail(page, `again-${person.email}`);
    await expect(
      emailForm(page).getByText(/email address has been changed/i),
    ).toBeVisible();
    await page.getByRole("button", { name: /^[A-Z]$/ }).click();
    await page.getByRole("menuitem", { name: "Log Out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    // Signing in again, and moving about by links, without reloading the page.
    await page.locator("#email").fill(`again-${person.email}`);
    await page.locator("#password").fill(OLD_PASSWORD);
    await page
      .locator("form")
      .getByRole("button", { name: "Sign In", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: /^[A-Z]$/ }).click();
    await page.getByRole("menuitem", { name: "Account" }).click();

    await expect(emailForm(page)).toBeVisible();
    await expect(
      emailForm(page).getByText(/email address has been changed/i),
    ).toHaveCount(0);
    await expect(emailForm(page).getByLabel("New email address")).toHaveValue(
      "",
    );
    await expect(
      emailForm(page).getByLabel("Current password", { exact: true }),
    ).toHaveValue("");
  });

  test("a message, or a password typed and not sent, is gone when they leave and return", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");
    await passwordForm(page)
      .getByLabel("Current password", { exact: true })
      .fill(OLD_PASSWORD);
    await passwordForm(page)
      .getByLabel("New password", { exact: true })
      .fill(NEW_PASSWORD);

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: /^[A-Z]$/ }).click();
    await page.getByRole("menuitem", { name: "Account" }).click();

    await expect(
      passwordForm(page).getByLabel("Current password", { exact: true }),
    ).toHaveValue("");
    await expect(
      passwordForm(page).getByLabel("New password", { exact: true }),
    ).toHaveValue("");
  });
});

test.describe("guessing the current password", () => {
  test("five wrong ones stop any more tries for a while, even the right password", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    for (let guess = 0; guess < 5; guess++) {
      await changePassword(page, {
        current: `wrong guess number ${String(guess)}`,
      });
      await expect(
        passwordForm(page)
          .getByRole("alert")
          .filter({ hasText: /isn't right/ }),
      ).toBeVisible();
    }
    await changePassword(page, {});

    await expect(
      passwordForm(page).getByText(
        /Too many wrong passwords\. Try again in \d+ minutes?\./,
      ),
    ).toBeVisible();
    await changeEmail(page, `blocked-${person.email}`);
    await expect(
      emailForm(page).getByText(/Too many wrong passwords/),
    ).toBeVisible();
    const again = await newPageOfTheirOwn(browser);
    await signInThroughThePage(again, person.email, OLD_PASSWORD);
    await expect(again).toHaveURL(/\/dashboard$/);
  });
});

test.describe("what a browser may fill in", () => {
  test("it is asked to leave the proof-of-identity and new-address fields empty", async ({
    as,
  }) => {
    const page = await as("user");
    await page.goto("/account");

    for (const field of [
      emailForm(page).getByLabel("New email address"),
      emailForm(page).getByLabel("Current password", { exact: true }),
      passwordForm(page).getByLabel("Current password", { exact: true }),
    ]) {
      await expect(field).toHaveAttribute("autocomplete", "off");
    }
    for (const field of [
      passwordForm(page).getByLabel("New password", { exact: true }),
      passwordForm(page).getByLabel("Confirm new password"),
    ]) {
      await expect(field).toHaveAttribute("autocomplete", "new-password");
    }
  });
});

test.describe("a shared computer", () => {
  test("someone else signing in on the same tab never sees the last person's details", async ({
    browser,
  }) => {
    const first = await createPerson();
    const second = await createPerson();
    const page = await signedInAs(browser, first);
    await page.goto("/account");
    await expect(emailForm(page).getByText(first.email)).toBeVisible();
    await page.getByRole("button", { name: /^[A-Z]$/ }).click();
    await page.getByRole("menuitem", { name: "Log Out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.locator("#email").fill(second.email);
    await page.locator("#password").fill(second.password);
    await page
      .locator("form")
      .getByRole("button", { name: "Sign In", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: /^[A-Z]$/ }).click();
    await page.getByRole("menuitem", { name: "Account" }).click();

    await expect(emailForm(page).getByText(second.email)).toBeVisible();
    await expect(
      main(page).getByText(`Signed in as ${second.name}`),
    ).toBeVisible();
    await expect(page.getByText(first.email)).toHaveCount(0);
  });
});

test.describe("changing the password", () => {
  test("the new password signs them in, and the old one no longer does", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changePassword(page, {});

    await expect(
      passwordForm(page).getByText(/password has been changed/i),
    ).toBeVisible();
    await expect(
      passwordForm(page).getByLabel("Current password", { exact: true }),
    ).toHaveValue("");

    const withNew = await newPageOfTheirOwn(browser);
    await signInThroughThePage(withNew, person.email, NEW_PASSWORD);
    await expect(withNew).toHaveURL(/\/dashboard$/);

    const withOld = await newPageOfTheirOwn(browser);
    await signInThroughThePage(withOld, person.email, OLD_PASSWORD);
    await expect(withOld.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("they stay signed in on the page they changed it on, and other devices are signed out", async ({
    browser,
  }) => {
    const person = await createPerson();
    const here = await signedInAs(browser, person);
    const elsewhere = await signedInAs(browser, person);
    await here.goto("/account");

    await changePassword(here, {});
    await expect(
      passwordForm(here).getByText(/password has been changed/i),
    ).toBeVisible();

    await here.goto("/dashboard");
    await expect(here).toHaveURL(/\/dashboard$/);
    await elsewhere.goto("/dashboard");
    await expect(elsewhere).toHaveURL(/\/sign-in$/);
  });

  test("the wrong current password is refused, and the old one still works", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changePassword(page, { current: "not my password" });

    await expect(
      passwordForm(page)
        .getByRole("alert")
        .filter({ hasText: /current password/ }),
    ).toBeVisible();
    const again = await newPageOfTheirOwn(browser);
    await signInThroughThePage(again, person.email, OLD_PASSWORD);
    await expect(again).toHaveURL(/\/dashboard$/);
  });

  test("a confirmation that doesn't match is refused before anything is sent", async ({
    browser,
  }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changePassword(page, { confirm: "something else entirely" });

    await expect(
      passwordForm(page).getByText(/confirmation don't match/i),
    ).toBeVisible();
  });

  test("the same password again is refused", async ({ browser }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changePassword(page, { next: OLD_PASSWORD });

    await expect(
      passwordForm(page).getByText(/different from your current one/i),
    ).toBeVisible();
  });

  test("a password that is too short isn't submitted", async ({ browser }) => {
    const person = await createPerson();
    const page = await signedInAs(browser, person);
    await page.goto("/account");

    await changePassword(page, { next: "short" });

    await expect(
      passwordForm(page).getByLabel("New password", { exact: true }),
    ).toHaveJSProperty("validity.tooShort", true);
    await expect(passwordForm(page).getByText(/has been changed/i)).toHaveCount(
      0,
    );
  });
});
