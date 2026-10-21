import type { Locator, Page } from "@playwright/test";
import { freshName, freshWord, withDatabase } from "./support/app.js";
import { expect, test } from "./support/test.js";

/** One of the form's sections, by its heading. */
const section = (page: Page, heading: string): Locator =>
  page.locator("section").filter({
    has: page.getByRole("heading", { name: heading, level: 2, exact: true }),
  });

/** Types into a "search as you type" field and chooses the option that matches. */
async function choose(
  field: Locator,
  text: string,
  option: string | RegExp,
): Promise<void> {
  await field.fill(text);
  await field.page().getByRole("option", { name: option }).first().click();
}

const create = (field: Locator, name: string) =>
  choose(field, name, `+ Create new "${name}"`);

const artistField = (page: Page) =>
  section(page, "Song").getByPlaceholder("Search artists…");
const titleField = (page: Page) => page.getByLabel("Title", { exact: true });
const submit = (page: Page) =>
  page.getByRole("button", { name: /^Add song|Adding song/ });
const styleWarning = (page: Page) =>
  page.getByRole("alert").filter({ hasText: "written in our style" });

const similarSongWarning = (page: Page) =>
  page.getByRole("alert").filter({ hasText: "may already be here" });

async function startNewSong(page: Page): Promise<void> {
  await page.goto("/songs/new");
  await expect(artistField(page)).toBeVisible();
  // The form is ready once its pickers answer.
  await page.waitForLoadState("networkidle");
}

test.describe("adding a song", () => {
  test("a new artist and a new title, added to the Master List, with the person as its advocate", async ({
    as,
  }) => {
    const page = await as("admin");
    const artist = freshName("Band");
    const title = freshName("Song");
    await startNewSong(page);

    await create(artistField(page), artist);
    await expect(page.getByText("A new artist will be created.")).toBeVisible();
    await titleField(page).fill(title);
    await page
      .getByLabel("Bio / notes (optional)")
      .fill("Added by the acceptance tests.");
    await submit(page).click();

    await expect(
      page.getByText(`“${title}” by ${artist} was added successfully.`),
    ).toBeVisible();
    await expect(page.getByText("Featured artists: None")).toBeVisible();
    await expect(page.getByText("Production: None")).toBeVisible();
    await expect(page.getByText("Cover of: Not a cover")).toBeVisible();
    await expect(
      page.getByText("Added to lists: The Master List"),
    ).toBeVisible();
    await expect(page.getByText("Advocates: You")).toBeVisible();

    await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ bio: string; creator: string }>(
        `select s.bio, u.name creator from song_lists.songs s
         join song_lists.users u on u.id = s.created_by where s.title = $1`,
        [title],
      );
      expect(rows).toEqual([
        { bio: "Added by the acceptance tests.", creator: "Al" },
      ]);
    });
  });

  test("the new song then turns up on the Master List, and on the person's dashboard history", async ({
    as,
  }) => {
    const page = await as("manager");
    const artist = freshName("Band");
    const title = freshName("Song");
    await startNewSong(page);
    await create(artistField(page), artist);
    await titleField(page).fill(title);
    await submit(page).click();
    await expect(
      page.getByText(`“${title}” by ${artist} was added successfully.`),
    ).toBeVisible();

    await page.goto(`/lists/1?q=${encodeURIComponent(title)}`);
    await expect(
      page.getByRole("row", { name: new RegExp(`${title} ${artist}`) }),
    ).toContainText("Cliff");

    await page.goto("/dashboard");
    await expect(
      page
        .getByRole("list", { name: "Songs you added, newest first" })
        .getByRole("listitem")
        .first(),
    ).toContainText(title);
  });

  test("an artist that already exists is picked from the list, not created again", async ({
    as,
  }) => {
    const page = await as("user");
    const title = freshName("Song");
    await startNewSong(page);

    await choose(artistField(page), "Beck", "Beck");
    await expect(page.getByText("A new artist will be created.")).toHaveCount(
      0,
    );
    await titleField(page).fill(title);
    await submit(page).click();

    await expect(
      page.getByText(`“${title}” by Beck was added successfully.`),
    ).toBeVisible();
    await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ n: string }>(
        "select count(*) n from song_lists.artists where name = 'Beck'",
      );
      expect(rows[0]?.n).toBe("1");
    });
  });

  test("with a featured artist, a production, a cover, several lists, and another advocate", async ({
    as,
  }) => {
    const page = await as("admin");
    const artist = freshName("Band");
    const guest = freshName("Guest");
    const film = freshName("Film");
    const title = freshName("Song");
    await startNewSong(page);

    await create(artistField(page), artist);
    await titleField(page).fill(title);
    await choose(
      section(page, "Featured artists").getByPlaceholder("Search artists…"),
      "Cowboy Junkies",
      "Cowboy Junkies",
    );
    await create(
      section(page, "Featured artists").getByPlaceholder("Search artists…"),
      guest,
    );
    await create(
      section(page, "Production").getByPlaceholder("Search productions…"),
      film,
    );
    await page.getByLabel("Release year").fill("1999");
    await section(page, "Production").getByRole("combobox").last().click();
    await page.getByRole("option", { name: "Television" }).click();
    await choose(
      section(page, "Cover").getByPlaceholder("Search songs…"),
      "Paper Trail",
      /Paper Trail\$ — Joey Bada\$\$/,
    );
    await page.getByRole("checkbox", { name: "On A Boat!" }).check();
    await page.getByRole("checkbox", { name: "Cliff" }).check();
    await submit(page).click();

    await expect(
      page.getByText(`“${title}” by ${artist} was added successfully.`),
    ).toBeVisible();
    await expect(
      page.getByText(`Featured artists: Cowboy Junkies, ${guest}`),
    ).toBeVisible();
    await expect(
      page.getByText(`Production: ${film} (1999, Television)`),
    ).toBeVisible();
    await expect(
      page.getByText("Cover of: Paper Trail$ — Joey Bada$$"),
    ).toBeVisible();
    await expect(
      page.getByText("Added to lists: The Master List, On A Boat!"),
    ).toBeVisible();
    await expect(page.getByText("Advocates: You, Cliff")).toBeVisible();

    await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ year: number; type: string }>(
        `select p.release_year as year, t.name as type from song_lists.productions p
         join song_lists.production_types t on t.id = p.type_id where p.name = $1`,
        [film],
      );
      expect(rows).toEqual([{ year: 1999, type: "Television" }]);
    });
  });

  test("a cover of a song that isn't in the catalog creates the original and its artist too", async ({
    as,
  }) => {
    const page = await as("admin");
    const original = freshName("Original");
    const originalArtist = freshName("Origin Band");
    await startNewSong(page);

    await create(artistField(page), freshName("Band"));
    await titleField(page).fill(freshName("Song"));
    await create(
      section(page, "Cover").getByPlaceholder("Search songs…"),
      original,
    );
    await expect(page.getByLabel("Original title")).toHaveValue(original);
    await create(
      section(page, "Cover").getByPlaceholder("Search artists…"),
      originalArtist,
    );
    await submit(page).click();

    await expect(
      page.getByText(`Cover of: ${original} by ${originalArtist}`),
    ).toBeVisible();
    await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ artist: string }>(
        `select a.name artist from song_lists.songs s join song_lists.artists a on a.id = s.artist_id where s.title = $1`,
        [original],
      );
      expect(rows).toEqual([{ artist: originalArtist }]);
    });
  });

  test("a featured artist can be taken off again before saving", async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);
    const featured = section(page, "Featured artists");

    await choose(
      featured.getByPlaceholder("Search artists…"),
      "Cowboy Junkies",
      "Cowboy Junkies",
    );
    await expect(featured.getByText("Cowboy Junkies")).toBeVisible();
    await featured
      .getByRole("button", { name: /remove/i })
      .first()
      .click();

    await expect(featured.getByText("Cowboy Junkies")).toHaveCount(0);
  });

  test("unticking every list adds the song to none of them", async ({ as }) => {
    const page = await as("admin");
    const artist = freshName("Band");
    await startNewSong(page);
    await create(artistField(page), artist);
    await titleField(page).fill(freshName("Song"));

    await page.getByRole("checkbox", { name: "The Master List" }).uncheck();
    await submit(page).click();

    await expect(page.getByText("Added to lists: None")).toBeVisible();
  });
});

test.describe("after a song is added", () => {
  test("Add another song gives a clean form", async ({ as }) => {
    const page = await as("admin");
    await startNewSong(page);
    await create(artistField(page), freshName("Band"));
    await titleField(page).fill(freshName("Song"));
    await submit(page).click();
    await expect(page.getByText(/was added successfully/)).toBeVisible();

    await page.getByRole("button", { name: "Add another song" }).click();

    await expect(titleField(page)).toHaveValue("");
    await expect(artistField(page)).toHaveValue("");
    await expect(
      page.getByRole("checkbox", { name: "The Master List" }),
    ).toBeChecked();
  });

  test("View lists goes to the lists page", async ({ as }) => {
    const page = await as("admin");
    await startNewSong(page);
    await create(artistField(page), freshName("Band"));
    await titleField(page).fill(freshName("Song"));
    await submit(page).click();
    await expect(page.getByText(/was added successfully/)).toBeVisible();

    await page.getByRole("button", { name: "View lists" }).click();

    await expect(page).toHaveURL(/\/lists$/);
  });
});

test.describe("when it can't be added yet", () => {
  test("without an artist, it says so", async ({ as }) => {
    const page = await as("admin");
    await startNewSong(page);
    await titleField(page).fill(freshName("Song"));

    await submit(page).click();

    await expect(page.getByText("Artist is required.")).toBeVisible();
  });

  test("without a title, the form won't send", async ({ as }) => {
    const page = await as("admin");
    await startNewSong(page);
    await create(artistField(page), freshName("Band"));

    await submit(page).click();

    await expect(titleField(page)).toHaveJSProperty(
      "validity.valueMissing",
      true,
    );
    await expect(page.getByText(/was added successfully/)).toHaveCount(0);
  });

  test("a song the artist already has can't be added again, and the button says why", async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);
    await choose(artistField(page), "Joey Bada", /Joey Bada\$\$/);

    await titleField(page).fill("paper trail$");

    await expect(page.getByText(/already exists/)).toBeVisible();
    await expect(submit(page)).toBeDisabled();
  });

  test("a title that differs only by a symbol is flagged as a likely match, but can still go ahead", async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);
    await choose(artistField(page), "Joey Bada", /Joey Bada\$\$/);

    await titleField(page).fill("Paper Trails");

    await expect(similarSongWarning(page)).toBeVisible();
    await expect(similarSongWarning(page)).toContainText(
      "We already have “Paper Trail$” by Joey Bada$$",
    );
    await expect(submit(page)).toBeEnabled();
  });

  test("the likely match can be looked at, in a tab of its own so the form is kept", async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);
    await choose(artistField(page), "Joey Bada", /Joey Bada\$\$/);
    await titleField(page).fill("Paper Trails");

    const link = similarSongWarning(page).getByRole("link", {
      name: /View “Paper Trail\$”/,
    });

    await expect(link).toHaveAttribute("href", /^\/song\/\d+$/);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(titleField(page)).toHaveValue("Paper Trails");
  });

  test("looking at the likely match leaves the form as it was", async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);
    await choose(artistField(page), "Joey Bada", /Joey Bada\$\$/);
    await titleField(page).fill("Paper Trails");
    await page.getByLabel("Bio / notes (optional)").fill("Half a thought");
    await page.evaluate(() => {
      (window as unknown as { stillHere: boolean }).stillHere = true;
    });

    const [opened] = await Promise.all([
      page.context().waitForEvent("page"),
      similarSongWarning(page)
        .getByRole("link", { name: /View “Paper Trail\$”/ })
        .click(),
    ]);
    await expect(
      opened.getByRole("heading", { name: "Paper Trail$" }),
    ).toBeVisible();
    await page.bringToFront();
    await page.waitForTimeout(1500);

    // Not reloaded: the marker set before the click is still there.
    expect(
      await page.evaluate(
        () => (window as unknown as { stillHere?: boolean }).stillHere,
      ),
    ).toBe(true);
    await expect(titleField(page)).toHaveValue("Paper Trails");
    await expect(page.getByLabel("Bio / notes (optional)")).toHaveValue(
      "Half a thought",
    );
    await expect(artistField(page)).toHaveValue(/Joey Bada/);
  });

  test("the likely match offers a way out: it's already there, so cancel", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Add song" }).click();
    await choose(artistField(page), "Joey Bada", /Joey Bada\$\$/);
    await titleField(page).fill("Paper Trails");

    await similarSongWarning(page)
      .getByRole("button", { name: /already there/ })
      .click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the same title by a different artist is not a duplicate", async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);
    await choose(artistField(page), "Beck", "Beck");

    await titleField(page).fill("Paper Trail$");
    await page.waitForTimeout(1000);

    await expect(page.getByText(/already exists|Did you mean/)).toHaveCount(0);
    await expect(submit(page)).toBeEnabled();
  });
});

test.describe("our house style for names", () => {
  test("a title in lowercase is held back, with the fix a click away", async ({
    as,
  }) => {
    const page = await as("admin");
    const artist = freshName("Band");
    const word = freshWord();
    await startNewSong(page);
    await create(artistField(page), artist);
    await titleField(page).fill(`the whole thing is ${word.toLowerCase()}`);

    await submit(page).click();

    await expect(styleWarning(page)).toBeVisible();
    await expect(
      page.getByText("This isn't written in our style yet"),
    ).toBeVisible();
    await expect(page.getByText(/was added successfully/)).toHaveCount(0);

    await page.getByRole("button", { name: /Change to/ }).click();

    await expect(titleField(page)).toHaveValue(`The Whole Thing Is ${word}`);
    await expect(styleWarning(page)).toHaveCount(0);
    await submit(page).click();
    await expect(
      page.getByText(
        `“The Whole Thing Is ${word}” by ${artist} was added successfully.`,
      ),
    ).toBeVisible();
  });

  test('odd capitals, "vs", and a leading article are all put right in one suggestion', async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);
    await create(artistField(page), freshName("Band"));

    await titleField(page).fill("the whole Thing is bullshit Vs. mOnEy, kid");
    await submit(page).click();

    await expect(page.getByRole("button", { name: /Change to/ })).toContainText(
      "The Whole Thing Is Bullshit vs. Money, Kid",
    );
  });

  test("two names at once can be fixed together", async ({ as }) => {
    const page = await as("admin");
    const word = freshWord();
    await startNewSong(page);
    await create(artistField(page), `zz uat the ${word.toLowerCase()} band`);
    await titleField(page).fill(`a ${word.toLowerCase()} song`);

    await submit(page).click();
    await expect(
      page.getByText("2 things aren't written in our style yet"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Change all to our style" }).click();

    await expect(styleWarning(page)).toHaveCount(0);
    await expect(titleField(page)).toHaveValue(`A ${word} Song`);
    await expect(artistField(page)).toHaveValue(`Zz Uat The ${word} Band`);
  });

  test("a deliberately stylized name goes through when its checkbox is ticked", async ({
    as,
  }) => {
    const page = await as("admin");
    const stylized = `Zz uAt${freshWord()}`;
    const title = freshName("Song");
    await startNewSong(page);
    await create(artistField(page), stylized);
    await titleField(page).fill(title);

    await submit(page).click();
    await expect(styleWarning(page)).toBeVisible();
    await page
      .getByRole("checkbox", { name: /highly artistic and commonly stylized/ })
      .check();
    await submit(page).click();

    await expect(
      page.getByText(`“${title}” by ${stylized} was added successfully.`),
    ).toBeVisible();
  });

  test("ticking the box for one name doesn't excuse a different one", async ({
    as,
  }) => {
    const page = await as("admin");
    const stylized = `Zz uAt${freshWord()}`;
    await startNewSong(page);
    await create(artistField(page), stylized);
    await titleField(page).fill("lowercase title here");

    await submit(page).click();
    await page
      .getByRole("checkbox", { name: /highly artistic and commonly stylized/ })
      .first()
      .check();
    await submit(page).click();

    await expect(page.getByText(/was added successfully/)).toHaveCount(0);
    await expect(styleWarning(page)).toBeVisible();
  });

  test("an existing artist isn't second-guessed, only what's new", async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);
    await choose(artistField(page), "Joey Bada", /Joey Bada\$\$/);
    await titleField(page).fill(freshName("Song"));

    await submit(page).click();

    await expect(page.getByText(/was added successfully/)).toBeVisible();
  });
});

test.describe("cancelling", () => {
  test("from the dashboard goes back to the dashboard", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Add song" }).click();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("when the form was opened directly, goes to the dashboard", async ({
    as,
  }) => {
    const page = await as("admin");
    await startNewSong(page);

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("starting over", () => {
  test("cancelling and opening the form again finds it empty", async ({
    as,
  }) => {
    const page = await as("admin");
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Add song" }).click();
    await expect(artistField(page)).toBeVisible();
    await choose(artistField(page), "Joey Bada", /Joey Bada\$\$/);
    await titleField(page).fill("Something half typed");
    await page.getByLabel("Bio / notes (optional)").fill("Half a thought");

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("link", { name: "Add song" }).click();

    await expect(artistField(page)).toBeVisible();
    await expect(artistField(page)).toHaveValue("");
    await expect(titleField(page)).toHaveValue("");
    await expect(page.getByLabel("Bio / notes (optional)")).toHaveValue("");
  });
});
