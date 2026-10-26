import type { Page } from "@playwright/test";
import {
  arrangeSong,
  arrangeSongDetails,
  type ArrangedSong,
  withDatabase,
} from "./support/app.js";
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

  // On purpose: the house-style check guards adding a song only. Editing stays
  // powerful, so an admin can save a title exactly as typed. If the check is
  // ever added here, this test should fail and that should be a decision.
  test("saves a title exactly as typed: the house-style check doesn't apply to editing", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    const lowercase = `${song.title} renamed in lowercase`.toLowerCase();

    await dialog(page)
      .getByRole("textbox", { name: "Title", exact: true })
      .fill(lowercase);
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(
      dialog(page).getByRole("heading", { name: lowercase, level: 2 }),
    ).toBeVisible();
    await expect(dialog(page).getByText(/in our style yet/)).toHaveCount(0);
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

test.describe("an admin editing a song's album details", () => {
  const albumField = (page: Page) =>
    dialog(page).getByRole("textbox", { name: "Album", exact: true });
  const yearField = (page: Page) =>
    dialog(page).getByRole("textbox", { name: "Year", exact: true });
  const lookUpButton = (page: Page) =>
    dialog(page).getByRole("button", {
      name: /^Look up album details|^Looking up/,
    });

  async function savedDetails(song: ArrangedSong) {
    return withDatabase(async (pool) => {
      const { rows } = await pool.query<{
        album_name: string | null;
        release_year: number | null;
        matched_by: string;
        source: string | null;
      }>(
        `select album_name, release_year, matched_by, source
         from song_lists.song_metadata where song_id = $1`,
        [song.id],
      );

      return rows;
    });
  }

  test("shows the details the song has now, ready to tighten up", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      source: "itunes",
      artworkUrl: "https://example.test/old/100x100bb.jpg",
      albumName: "Old Album",
      releaseYear: 1975,
    });
    await openSong(page, song);

    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await expect(albumField(page)).toHaveValue("Old Album");
    await expect(yearField(page)).toHaveValue("1975");
    await expect(
      dialog(page).getByRole("textbox", { name: "Cover art address" }),
    ).toHaveValue("https://example.test/old/100x100bb.jpg");
  });

  test("saves a corrected album as set by hand, so it stays", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      source: "itunes",
      albumName: "Old Album",
      releaseYear: 1975,
    });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await albumField(page).fill("The Right Album");
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(
      dialog(page).getByText("The Right Album · 1975"),
    ).toBeVisible();
    expect(await savedDetails(song)).toEqual([
      {
        album_name: "The Right Album",
        release_year: 1975,
        matched_by: "manual",
        source: "itunes",
      },
    ]);
  });

  test("looks the song up again, waiting for the answer, and saves what comes back", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      albumName: "Old Album",
      releaseYear: 1975,
    });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await lookUpButton(page).click();

    await expect(
      dialog(page).getByRole("button", { name: "Looking up…" }),
    ).toBeDisabled();
    await expect(
      dialog(page).getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
    await expect(
      dialog(page).getByText(/Looking up album details on iTunes/),
    ).toBeVisible();

    await expect(albumField(page)).toHaveValue(`Stub Album for ${song.title}`);
    await expect(yearField(page)).toHaveValue("1999");
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(
      dialog(page).getByText(`Stub Album for ${song.title} · 1999`),
    ).toBeVisible();
    expect(await savedDetails(song)).toMatchObject([
      { release_year: 1999, matched_by: "manual", source: "itunes" },
    ]);
  });

  test("leaves a song's details alone when the form's are untouched", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      albumName: "Old Album",
      releaseYear: 1975,
    });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await dialog(page)
      .getByRole("textbox", { name: "Add a note", exact: true })
      .fill("Only a note.");
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(noteLines(page)).toHaveCount(1);
    expect(await savedDetails(song)).toMatchObject([
      { album_name: "Old Album", matched_by: "auto" },
    ]);
  });

  test("fills in details for a song that had none", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    await expect(albumField(page)).toHaveValue("");

    await albumField(page).fill("Brand New Album");
    await yearField(page).fill("2024");
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(
      dialog(page).getByText("Brand New Album · 2024"),
    ).toBeVisible();
    expect(await savedDetails(song)).toMatchObject([
      {
        album_name: "Brand New Album",
        release_year: 2024,
        matched_by: "manual",
      },
    ]);
  });

  const removeButton = (page: Page) =>
    dialog(page).getByRole("button", { name: "Remove album details" });

  test("removes a song's details, which then no longer show on it", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      source: "itunes",
      albumName: "Doomed Album",
      releaseYear: 1975,
    });
    await openSong(page, song);
    await expect(dialog(page).getByText("Doomed Album · 1975")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await removeButton(page).click();

    await expect(
      dialog(page).getByText(
        "The album details will be removed when you save.",
      ),
    ).toBeVisible();
    await expect(albumField(page)).toHaveValue("");
    await dialog(page).getByRole("button", { name: "Save changes" }).click();

    await expect(
      dialog(page).getByRole("heading", { name: song.title, level: 2 }),
    ).toBeVisible();
    await expect(dialog(page).getByText("Doomed Album")).toHaveCount(0);
    expect(await savedDetails(song)).toEqual([
      {
        album_name: null,
        release_year: null,
        matched_by: "manual",
        source: null,
      },
    ]);
  });

  test("changes its mind about removing the details", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      albumName: "Spared Album",
      releaseYear: 1975,
    });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    await removeButton(page).click();

    await dialog(page).getByRole("button", { name: "Keep them" }).click();

    await expect(albumField(page)).toHaveValue("Spared Album");
    await expect(removeButton(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Save changes" }).click();
    await expect(dialog(page).getByText("Spared Album · 1975")).toBeVisible();
    expect(await savedDetails(song)).toMatchObject([
      { album_name: "Spared Album", matched_by: "auto" },
    ]);
  });

  test("typing new details after asking to remove them keeps the song's details instead", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      albumName: "Old Album",
      releaseYear: 1975,
    });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    await removeButton(page).click();

    await albumField(page).fill("Replacement Album");

    await expect(
      dialog(page).getByText(
        "The album details will be removed when you save.",
      ),
    ).toHaveCount(0);
    await yearField(page).fill("1980");
    await dialog(page).getByRole("button", { name: "Save changes" }).click();
    await expect(
      dialog(page).getByText("Replacement Album · 1980"),
    ).toBeVisible();
  });

  test("offers no removal for a song with no details", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);

    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await expect(albumField(page)).toBeVisible();
    await expect(removeButton(page)).toHaveCount(0);
  });

  test("says so when a lookup finds just the details the song already has", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      source: "itunes",
      artworkUrl: "https://example.test/stub/100x100bb.jpg",
      albumName: `Stub Album for ${song.title}`,
      releaseYear: 1999,
    });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await lookUpButton(page).click();

    await expect(
      dialog(page).getByText(`Found “${song.title}” by`),
    ).toBeVisible();
    const sentence = dialog(page).getByText(
      "It matches the details already here, so there’s nothing to change.",
    );
    await expect(sentence).toBeVisible();
    await expect(sentence).toHaveClass(/text-green-/);
    await expect(albumField(page)).toHaveValue(`Stub Album for ${song.title}`);
  });

  test("asks for the details to be checked when a lookup finds something different", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await arrangeSongDetails(song, {
      albumName: "Old Album",
      releaseYear: 1975,
    });
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    await lookUpButton(page).click();

    await expect(
      dialog(page).getByText(
        /Found “.+” by .+\. Check the details below and correct anything before saving\./,
      ),
    ).toBeVisible();
    await expect(
      dialog(page).getByText("It matches the details already here"),
    ).toHaveCount(0);
    const sentence = dialog(page).getByText(
      "Check the details below and correct anything before saving.",
    );
    await expect(sentence).toHaveClass(/text-amber-/);
  });
});

test.describe("the edit form's lists and advocates", () => {
  test("take little room: the lists scroll and the advocates sit side by side", async ({
    as,
  }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();

    const lists = dialog(page).getByRole("group", { name: "On these lists" });
    const advocates = dialog(page).getByRole("group", {
      name: "Championed by",
    });
    const size = await lists.evaluate((element) => ({
      shown: element.clientHeight,
      all: element.scrollHeight,
    }));
    const [first, second] = await Promise.all([
      advocates.locator("label").nth(0).boundingBox(),
      advocates.locator("label").nth(1).boundingBox(),
    ]);

    expect(size.shown).toBeLessThanOrEqual(100);
    expect(size.all).toBeGreaterThan(size.shown);
    expect(second?.y).toBeCloseTo(first?.y ?? -1, 0);
    await lists.getByRole("checkbox", { name: "Getting Lit" }).check();
    await dialog(page).getByRole("button", { name: "Save changes" }).click();
    await expect(
      dialog(page).getByRole("link", { name: "Getting Lit" }),
    ).toBeVisible();
  });
});

test.describe("an admin editing a song whose title the lookup spells differently", () => {
  test("can take the service's title with one click", async ({ as }) => {
    const page = await as("admin");
    const song = await arrangeSong();
    await openSong(page, song);
    await dialog(page).getByRole("button", { name: "Edit" }).click();
    const title = dialog(page).getByRole("textbox", {
      name: "Title",
      exact: true,
    });
    await title.fill(`${song.title} Misspelled`);

    await dialog(page)
      .getByRole("button", { name: "Look up album details" })
      .click();
    await dialog(page)
      .getByRole("button", {
        name: `Use “${song.title} Correct” as the title`,
      })
      .click();

    await expect(title).toHaveValue(`${song.title} Correct`);
    await dialog(page).getByRole("button", { name: "Save changes" }).click();
    await expect(
      dialog(page).getByRole("heading", {
        name: `${song.title} Correct`,
        level: 2,
      }),
    ).toBeVisible();
  });
});
