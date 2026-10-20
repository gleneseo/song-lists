import type { Page } from "@playwright/test";
import { arrangeSong, type ArrangedSong, withDatabase } from "./support/app.js";
import { expect, test } from "./support/test.js";

const dialog = (page: Page) => page.getByRole("dialog");

/** Opens a song's modal from the Master List, where the arranged songs are. */
async function openSong(page: Page, song: ArrangedSong): Promise<void> {
  await page.goto(`/lists/1?q=${encodeURIComponent(song.title)}`);
  await expect(page.locator("tbody a[data-live]").first()).toBeVisible();
  await page.getByRole("link", { name: song.title, exact: true }).click();
  await expect(
    dialog(page).getByRole("heading", { name: song.title, level: 2 }),
  ).toBeVisible();
}

/** A song's notes, a line at a time, as the modal shows them. */
const noteLines = (page: Page) =>
  dialog(page)
    .getByRole("heading", { name: "Notes", level: 3 })
    .locator("xpath=following-sibling::div[1]/p");

const SIGNED_NOTE = (text: string, author: string) =>
  new RegExp(
    `^${text} — ${author} · [A-Z][a-z]{2} \\d{1,2}, \\d{4}, \\d{1,2}:\\d{2} (AM|PM) (PDT|PST)$`,
  );

test.describe("who can change a song", () => {
  test("an ordinary user can read a song but has no Edit button", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong({ bio: "Already here." });

    await openSong(page, song);

    await expect(dialog(page).getByText("Already here.")).toBeVisible();
    await expect(
      dialog(page).getByRole("button", { name: "Edit" }),
    ).toHaveCount(0);
  });

  test("a manager can only add a note: their form has a single box", async ({
    as,
  }) => {
    const page = await as("manager");
    const song = await arrangeSong({ bio: "Already here." });
    await openSong(page, song);

    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await expect(
      dialog(page).getByRole("heading", {
        name: `Add a note to ${song.title}`,
      }),
    ).toBeVisible();
    await expect(dialog(page).getByText("Already here.")).toBeVisible();
    await expect(dialog(page).getByRole("textbox")).toHaveCount(1);
    await expect(
      dialog(page).getByRole("textbox", { name: "New note" }),
    ).toBeVisible();
    await expect(
      dialog(page).getByRole("textbox", { name: "Title" }),
    ).toHaveCount(0);
  });

  test("an admin gets the whole form", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);

    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await expect(
      dialog(page).getByRole("heading", { name: "Edit song" }),
    ).toBeVisible();
    for (const name of ["Title", "Notes", "Add a note"]) {
      await expect(
        dialog(page).getByRole("textbox", { name, exact: true }),
        name,
      ).toBeVisible();
    }
    await expect(
      dialog(page).getByRole("checkbox", { name: "The Master List" }),
    ).toBeChecked();
  });

  for (const role of ["manager", "user"] as const) {
    test(`a ${role} can't edit an artist or a production, only an admin can`, async ({
      as,
    }) => {
      const page = await as(role);
      const song = await arrangeSong();

      await page.goto(`/artist/${String(song.artistId)}`);
      await expect(
        page.getByRole("heading", { name: song.artist, level: 1 }),
      ).toBeVisible();

      await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    });
  }
});

test.describe("adding a note", () => {
  test("a manager's note is signed with their name and the date and time, below the others", async ({
    as,
  }) => {
    const page = await as("manager");
    const song = await arrangeSong({ bio: "First note -Al" });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await dialog(page)
      .getByRole("textbox", { name: "New note" })
      .fill("Great live.");
    await dialog(page).getByRole("button", { name: "Add note" }).click();

    await expect(noteLines(page)).toHaveCount(2);
    await expect(noteLines(page).first()).toHaveText("First note -Al");
    await expect(noteLines(page).nth(1)).toHaveText(
      SIGNED_NOTE("Great live\\.", "Cliff"),
    );
    await expect(
      dialog(page).getByRole("button", { name: "Edit" }),
    ).toBeVisible();
  });

  test("on a song with no notes, the note is the first and only one", async ({
    as,
  }) => {
    const page = await as("manager");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await dialog(page)
      .getByRole("textbox", { name: "New note" })
      .fill("Hello.");
    await dialog(page).getByRole("button", { name: "Add note" }).click();

    await expect(noteLines(page)).toHaveCount(1);
    await expect(noteLines(page).first()).toHaveText(
      SIGNED_NOTE("Hello\\.", "Cliff"),
    );
  });

  test("the note is still there after reloading, and on the song's own page", async ({
    as,
  }) => {
    const page = await as("manager");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    await dialog(page)
      .getByRole("textbox", { name: "New note" })
      .fill("Kept for good.");
    await dialog(page).getByRole("button", { name: "Add note" }).click();
    await expect(noteLines(page)).toHaveCount(1);

    await page.reload();

    await expect(
      page.getByText(SIGNED_NOTE("Kept for good\\.", "Cliff")),
    ).toBeVisible();
  });

  test("cancelling leaves the notes as they were", async ({ as }) => {
    const page = await as("manager");
    const song = await arrangeSong({ bio: "Untouched." });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    await dialog(page)
      .getByRole("textbox", { name: "New note" })
      .fill("Never saved.");

    await dialog(page).getByRole("button", { name: "Cancel" }).click();

    await expect(noteLines(page)).toHaveCount(1);
    await expect(noteLines(page).first()).toHaveText("Untouched.");
  });

  test("a note of only spaces is refused", async ({ as }) => {
    const page = await as("manager");
    const song = await arrangeSong({ bio: "Untouched." });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await dialog(page).getByRole("textbox", { name: "New note" }).fill("   ");
    await dialog(page).getByRole("button", { name: "Add note" }).click();

    await expect(dialog(page).getByText("Write a note first.")).toBeVisible();
  });

  test("each note gets the next color of the rainbow, and starts over after the seventh", async ({
    as,
  }) => {
    const page = await as("user");
    const song = await arrangeSong({
      bio: ["a", "b", "c", "d", "e", "f", "g", "h"].join("\n"),
    });

    await openSong(page, song);

    const colors = [
      "violet",
      "blue",
      "cyan",
      "green",
      "amber",
      "orange",
      "red",
      "violet",
    ];
    await expect(noteLines(page)).toHaveCount(8);
    for (const [index, color] of colors.entries()) {
      await expect(
        noteLines(page).nth(index),
        `note ${String(index + 1)}`,
      ).toHaveClass(new RegExp(`text-${color}-`));
    }
  });

  test("notes added at the same moment by two people are both kept", async ({
    as,
  }) => {
    const first = await as("manager");
    const second = await as("manager");
    const song = await arrangeSong({ bio: "Original." });
    await openSong(first, song);
    await openSong(second, song);
    await first
      .getByRole("dialog")
      .getByRole("button", { name: "Edit" })
      .click();
    await second
      .getByRole("dialog")
      .getByRole("button", { name: "Edit" })
      .click();
    await first
      .getByRole("dialog")
      .getByRole("textbox", { name: "New note" })
      .fill("From the first.");
    await second
      .getByRole("dialog")
      .getByRole("textbox", { name: "New note" })
      .fill("From the second.");

    await Promise.all([
      first
        .getByRole("dialog")
        .getByRole("button", { name: "Add note" })
        .click(),
      second
        .getByRole("dialog")
        .getByRole("button", { name: "Add note" })
        .click(),
    ]);

    await expect(noteLines(first)).toHaveCount(3);
    await expect(noteLines(second)).toHaveCount(3);
    await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ bio: string }>(
        "select bio from song_lists.songs where id = $1",
        [song.id],
      );
      const lines = rows[0]?.bio.split("\n") ?? [];
      expect(lines[0]).toBe("Original.");
      expect(lines.some((line) => line.startsWith("From the first."))).toBe(
        true,
      );
      expect(lines.some((line) => line.startsWith("From the second."))).toBe(
        true,
      );
    });
  });

  test("a manager's note isn't lost when an admin saves the full form at the same moment", async ({
    as,
  }) => {
    const manager = await as("manager");
    const admin = await as("admin");
    const song = await arrangeSong({ bio: "Original." });
    await openSong(manager, song);
    await openSong(admin, song);
    await manager
      .getByRole("dialog")
      .getByRole("button", { name: "Edit" })
      .click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Edit" })
      .click();
    await manager
      .getByRole("dialog")
      .getByRole("textbox", { name: "New note" })
      .fill("From Cliff.");
    await admin
      .getByRole("dialog")
      .getByRole("textbox", { name: "Add a note" })
      .fill("From Al.");

    await Promise.all([
      manager
        .getByRole("dialog")
        .getByRole("button", { name: "Add note" })
        .click(),
      admin
        .getByRole("dialog")
        .getByRole("button", { name: "Save changes" })
        .click(),
    ]);

    // Both saves are in flight after the clicks, so wait for them to land.
    await expect
      .poll(async () => {
        const bio = await withDatabase(async (pool) => {
          const { rows } = await pool.query<{ bio: string }>(
            "select bio from song_lists.songs where id = $1",
            [song.id],
          );
          return rows[0]?.bio ?? "";
        });
        return [bio.includes("From Cliff."), bio.includes("From Al.")];
      })
      .toEqual([true, true]);
  });

  test("an admin who rewrote the notes is told, not allowed to overwrite a note added meanwhile", async ({
    as,
  }) => {
    const manager = await as("manager");
    const admin = await as("admin");
    const song = await arrangeSong({ bio: "Original." });
    await openSong(manager, song);
    await openSong(admin, song);
    await manager
      .getByRole("dialog")
      .getByRole("button", { name: "Edit" })
      .click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Edit" })
      .click();
    await admin
      .getByRole("dialog")
      .getByRole("textbox", { name: "Notes", exact: true })
      .fill("Rewritten.");
    await manager
      .getByRole("dialog")
      .getByRole("textbox", { name: "New note" })
      .fill("From Cliff.");
    await manager
      .getByRole("dialog")
      .getByRole("button", { name: "Add note" })
      .click();
    await expect(
      manager.getByRole("dialog").getByText("From Cliff."),
    ).toBeVisible();

    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Save changes" })
      .click();

    await expect(
      admin.getByRole("dialog").getByText(/changed by someone else/),
    ).toBeVisible();
    await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ bio: string }>(
        "select bio from song_lists.songs where id = $1",
        [song.id],
      );
      expect(rows[0]?.bio).toContain("From Cliff.");
      expect(rows[0]?.bio).not.toContain("Rewritten.");
    });
  });
});

test.describe("an admin editing a song", () => {
  test("adds a signed note from the full form, and saves other changes with it", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong({ bio: "Old notes." });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await dialog(page)
      .getByRole("textbox", { name: "Add a note", exact: true })
      .fill("Admin's word.");
    await dialog(page).getByRole("checkbox", { name: "On A Boat!" }).check();
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(noteLines(page)).toHaveCount(2);
    await expect(noteLines(page).nth(1)).toHaveText(
      SIGNED_NOTE("Admin's word\\.", "Al"),
    );
    await expect(
      dialog(page).getByRole("link", { name: "On A Boat!" }),
    ).toBeVisible();
  });

  test("renames the song, and the list shows the new title", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    const renamed = `${song.title} Renamed`;

    await dialog(page)
      .getByRole("textbox", { name: "Title", exact: true })
      .fill(renamed);
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(
      dialog(page).getByRole("heading", { name: renamed, level: 2 }),
    ).toBeVisible();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await page.goto(`/lists/1?q=${encodeURIComponent(renamed)}`);
    await expect(
      page.getByRole("link", { name: renamed, exact: true }),
    ).toBeVisible();
  });

  test("won't rename a song to another by the same artist", async ({ as }) => {
    const page = await as("admin");
    const first = await arrangeSong();
    const second = await arrangeSong({ sameArtistAs: first });
    await openSong(page, second);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await dialog(page)
      .getByRole("textbox", { name: "Title", exact: true })
      .fill(first.title.toLowerCase());
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(dialog(page).getByText(/already exists/)).toBeVisible();
    await expect(
      dialog(page).getByRole("heading", { name: "Edit song" }),
    ).toBeVisible();
  });

  test("takes a song off a list, and puts it on another", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await dialog(page)
      .getByRole("checkbox", { name: "The Master List" })
      .uncheck();
    await dialog(page).getByRole("checkbox", { name: "Getting Lit" }).check();
    await dialog(page).getByRole("button", { name: "Save changes" }).click();
    await expect(
      dialog(page).getByRole("link", { name: "Getting Lit" }),
    ).toBeVisible();
    await expect(
      dialog(page).getByRole("link", { name: "The Master List" }),
    ).toHaveCount(0);

    await page.goto(`/lists/8?q=${encodeURIComponent(song.title)}`);
    await expect(
      page.getByRole("link", { name: song.title, exact: true }),
    ).toBeVisible();
  });

  test("gives a song a featured artist", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    const featured = dialog(page)
      .locator("section, div")
      .filter({
        has: page.getByRole("heading", { name: "Featured artists", level: 3 }),
      })
      .last();
    await featured.getByPlaceholder("Search artists…").fill("Cowboy Junkies");
    await page.getByRole("option", { name: "Cowboy Junkies" }).first().click();
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(dialog(page).getByText(/Cowboy Junkies/)).toBeVisible();
  });

  test("cancelling the edit changes nothing", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    await dialog(page)
      .getByRole("textbox", { name: "Title", exact: true })
      .fill("Something else entirely");

    await dialog(page).getByRole("button", { name: "Cancel" }).click();

    await expect(
      dialog(page).getByRole("heading", { name: song.title, level: 2 }),
    ).toBeVisible();
  });
});

test.describe("an admin editing an artist or a production", () => {
  test("renames an artist, which then shows on their songs", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await page.goto(`/artist/${String(song.artistId)}`);
    await page.getByRole("button", { name: "Edit" }).click();
    const renamed = `${song.artist} Reunited`;

    await page.getByRole("textbox", { name: "Name" }).fill(renamed);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByRole("heading", { name: renamed, level: 1 }),
    ).toBeVisible();
    await page.goto(`/lists/1?q=${encodeURIComponent(song.title)}`);
    await expect(
      page.getByRole("link", { name: renamed, exact: true }),
    ).toBeVisible();
  });

  test("won't give an artist a name another already has", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await page.goto(`/artist/${String(song.artistId)}`);
    await page.getByRole("button", { name: "Edit" }).click();

    await page.getByRole("textbox", { name: "Name" }).fill("beck");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText(/already exists/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Edit artist" }),
    ).toBeVisible();
  });

  test("changes a production's name, year, and type", async ({ as }) => {
    const page = await as("admin");
    const name = `Zz Uat Film ${String(Date.now())}`;
    const id = await withDatabase(async (pool) => {
      const { rows } = await pool.query<{ id: number }>(
        `insert into song_lists.productions (name, release_year, type_id, created_by, updated_by)
         select $1, 1980, t.id, u.id, u.id from song_lists.production_types t, song_lists.users u
         where t.name = 'Film' and u.name = 'Al' returning id`,
        [name],
      );
      return rows[0]?.id ?? 0;
    });
    await page.goto(`/production/${String(id)}`);
    await expect(page.getByText("Film · 1980")).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).click();

    await page.getByRole("textbox", { name: "Name" }).fill(`${name} Redux`);
    await page.getByRole("spinbutton", { name: "Release year" }).fill("2001");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Television" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByRole("heading", { name: `${name} Redux`, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Television · 2001")).toBeVisible();
  });

  test("refuses a year that can't be right", async ({ as }) => {
    const page = await as("admin");
    await page.goto("/production/1");
    await page.getByRole("button", { name: "Edit" }).click();

    await page.getByRole("spinbutton", { name: "Release year" }).fill("1500");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Enter a valid release year.")).toBeVisible();
  });
});
