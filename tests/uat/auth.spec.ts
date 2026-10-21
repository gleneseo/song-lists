import {
  freshEmail,
  navLink,
  signInThroughThePage,
  signUpThroughThePage,
} from "./support/app.js";
import { PEOPLE, SEED_PASSWORD } from "./support/people.js";
import { expect, test } from "./support/test.js";

test.describe("signing in", () => {
  test("a seeded person signs in with their password and lands on their dashboard", async ({
    page,
  }) => {
    await signInThroughThePage(page, PEOPLE.manager.email);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", {
        name: `Welcome back, ${PEOPLE.manager.name}`,
      }),
    ).toBeVisible();
    await expect(navLink(page, "/dashboard").first()).toBeVisible();
  });

  test("a wrong password is refused with a message, and they stay on the sign-in page", async ({
    page,
  }) => {
    await signInThroughThePage(page, PEOPLE.user.email, "not the password");

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(
      page
        .locator("form")
        .getByRole("button", { name: "Sign In", exact: true }),
    ).toBeEnabled();
  });

  test("an email nobody signed up with is refused the same way", async ({
    page,
  }) => {
    await signInThroughThePage(page, "nobody@example.com", SEED_PASSWORD);

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("the sign-in form won't submit without an email and a password", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page
      .locator("form")
      .getByRole("button", { name: "Sign In", exact: true })
      .click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByLabel("Email")).toHaveJSProperty(
      "validity.valueMissing",
      true,
    );
  });

  test("someone already signed in who visits the front page is sent to their dashboard", async ({
    as,
  }) => {
    const page = await as("user");

    await page.goto("/");

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("the password field", () => {
  for (const [path, button] of [
    ["/sign-in", "Sign In"],
    ["/sign-up", "Sign Up"],
  ] as const) {
    test(`on ${path}, the show and hide button reveals what was typed and covers it again`, async ({
      page,
    }) => {
      await page.goto(path);
      const password = page.getByLabel("Password", { exact: true });
      await password.fill("hunter2-hunter2");

      await expect(password).toHaveAttribute("type", "password");

      await page.getByRole("button", { name: "Show password" }).click();
      await expect(password).toHaveAttribute("type", "text");
      await expect(password).toHaveValue("hunter2-hunter2");

      await page.getByRole("button", { name: "Hide password" }).click();
      await expect(password).toHaveAttribute("type", "password");
      await expect(
        page.locator("form").getByRole("button", { name: button, exact: true }),
      ).toBeVisible();
    });
  }

  test("showing the password doesn't submit the form", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(PEOPLE.user.email);
    await page.getByLabel("Password", { exact: true }).fill("whatever-it-is");

    await page.getByRole("button", { name: "Show password" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test.describe("signing up", () => {
  test("a new person signs up, lands on their dashboard, and is an ordinary user", async ({
    page,
  }) => {
    const email = freshEmail();

    await signUpThroughThePage(page, {
      name: "Newcomer Person",
      email,
      password: "a long enough password",
    });

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Welcome back, Newcomer" }),
    ).toBeVisible();
    // An ordinary user: none of the admin's links.
    await expect(navLink(page, "/dashboard").first()).toBeVisible();
    await expect(navLink(page, "/users")).toHaveCount(0);
  });

  test("the new person can sign out and back in with what they chose", async ({
    page,
  }) => {
    const email = freshEmail();
    await signUpThroughThePage(page, {
      name: "Returning Person",
      email,
      password: "a long enough password",
    });
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "R", exact: true }).click();
    await page.getByRole("menuitem", { name: "Log Out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await signInThroughThePage(page, email, "a long enough password");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Welcome back, Returning" }),
    ).toBeVisible();
  });

  test("an email that already has an account is refused", async ({ page }) => {
    await signUpThroughThePage(page, {
      name: "Copycat",
      email: PEOPLE.admin.email,
      password: "a long enough password",
    });

    await expect(
      page.getByText(/already exists|already in use/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("a password under eight characters is refused before anything is sent", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Short Password");
    await page.getByLabel("Email").fill(freshEmail());
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page
      .locator("form")
      .getByRole("button", { name: "Sign Up", exact: true })
      .click();

    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByLabel("Password", { exact: true })).toHaveJSProperty(
      "validity.tooShort",
      true,
    );
  });
});

test.describe("moving between the two forms and out of the app", () => {
  test("each form links to the other", async ({ page }) => {
    await page.goto("/sign-in");
    await page
      .getByText("have an account?")
      .getByRole("link", { name: "Sign up" })
      .click();
    await expect(page).toHaveURL(/\/sign-up$/);

    await page
      .getByText("Already have an account?")
      .getByRole("link", { name: "Sign in" })
      .click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("logging out ends the session, and the pages that need one send them to sign in", async ({
    as,
  }) => {
    const page = await as("manager");
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "C", exact: true }).click();
    await page.getByRole("menuitem", { name: "Log Out" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    for (const path of ["/dashboard", "/lists", "/songs/new"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in$/);
    }
  });

  test("someone who isn't signed in is sent to sign in from every page that needs it", async ({
    page,
  }) => {
    for (const path of [
      "/dashboard",
      "/lists",
      "/lists/1",
      "/songs/new",
      "/song/2",
      "/artist/1",
      "/production/1",
      "/users",
      "/account",
    ]) {
      await page.goto(path);
      await expect(page, `visiting ${path}`).toHaveURL(/\/sign-in$/);
    }
  });

  test("the front page, for someone not signed in, offers to sign in or sign up", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /browse and build song lists/i }),
    ).toBeVisible();
    await expect(navLink(page, "/sign-in")).toBeVisible();
    await expect(navLink(page, "/sign-up")).toBeVisible();
  });
});
