import { LIST_EXTRA_COLUMN } from "@song-lists/db/list-extra-column";
import { USER_ROLE } from "@song-lists/db/user-role";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openAppDatabase } from "./support/app-database";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * The app leans on a few facts about the data the migrations seed, and
 * nothing else would notice if a migration quietly stopped providing one.
 */
describe("what the app expects of the seeded data", () => {
  let pool: Pool;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
  });

  afterAll(async () => {
    await pool.end();
  });

  const rows = async <T>(sql: string, params: unknown[] = []) =>
    (await pool.query(sql, params)).rows as T[];

  it("should include the Master List the lists page defaults to", async () => {
    const { MASTER_LIST_NAME } = await import("@/lib/lists/list-view");

    expect(
      await rows(
        `select id from song_lists.lists where name = '${MASTER_LIST_NAME}'`,
      ),
    ).toHaveLength(1);
  });

  it("should give every list only columns the app knows how to show", async () => {
    const { parseExtraColumns } = await import("@/lib/lists/extra-columns");
    const lists = await rows<{ name: string; extra_columns: string[] }>(
      "select name, extra_columns from song_lists.lists",
    );

    for (const list of lists) {
      // A misspelled column would be dropped silently, so compare what's kept.
      expect(parseExtraColumns(list.extra_columns).toSorted()).toEqual(
        [...new Set(list.extra_columns)].toSorted(),
      );
      expect(
        list.extra_columns.every((column) =>
          (Object.values(LIST_EXTRA_COLUMN) as string[]).includes(column),
        ),
      ).toBe(true);
    }
  });

  it("should give every user a role the app understands", async () => {
    const found = await rows<{ role: string }>(
      "select distinct role from song_lists.users",
    );

    expect(
      found.every((user) =>
        (Object.values(USER_ROLE) as string[]).includes(user.role),
      ),
    ).toBe(true);
  });

  it("should make the System user an admin who can't sign in", async () => {
    const [system] = await rows<{ role: string; accounts: string }>(
      `select u.role, (select count(*) from song_lists.accounts a where a.user_id = u.id) accounts
       from song_lists.users u where u.id = '${SYSTEM_USER_ID}'`,
    );

    expect(system).toEqual({ role: "admin", accounts: "0" });
  });

  it("should seed Al as the admin and give everyone else a password they can sign in with", async () => {
    const people = await rows<{ name: string; role: string; accounts: string }>(
      `select u.name, u.role,
              (select count(*) from song_lists.accounts a
               where a.user_id = u.id and a.provider_id = 'credential' and a.password is not null) accounts
       from song_lists.users u where u.id <> '${SYSTEM_USER_ID}'`,
    );

    expect(people.filter((person) => person.role === "admin")).toEqual([
      expect.objectContaining({ name: "Al" }),
    ]);
    expect(
      people
        .filter((person) => person.role === "manager")
        .map((person) => person.name)
        .toSorted(),
    ).toEqual(["Chad", "Cliff", "Minnz", "Ryan", "Stuff"]);
    expect(people.every((person) => Number(person.accounts) === 1)).toBe(true);
  });

  it("should put an advocate on every song in the Master List", async () => {
    const { MASTER_LIST_NAME } = await import("@/lib/lists/list-view");
    const bare = await rows<{ title: string }>(
      `select s.title from song_lists.list_songs ls
       join song_lists.lists l on l.id = ls.list_id
       join song_lists.songs s on s.id = ls.song_id
       where l.name = '${MASTER_LIST_NAME}'
         and not exists (select 1 from song_lists.song_advocates sa where sa.song_id = s.id)`,
    );

    expect(bare).toEqual([]);
  });

  it("should not seed two songs with the same title by the same artist", async () => {
    expect(
      await rows(
        `select artist_id, lower(title) from song_lists.songs
         group by artist_id, lower(title) having count(*) > 1`,
      ),
    ).toEqual([]);
  });

  it("should seed a song's old comments as notes, one per line, leaving no bio behind", async () => {
    expect(
      await rows("select title from song_lists.songs where bio is not null"),
    ).toEqual([]);
    expect(
      await rows(
        `select n.body, u.name author from song_lists.song_notes n
         join song_lists.songs s on s.id = n.song_id
         join song_lists.users u on u.id = n.created_by
         where s.title = 'Hit The Lights' order by n.id`,
      ),
    ).toEqual([
      { body: "REALLY? THE WHOLE ALBUM?", author: "Al" },
      { body: "Yes, BECAUSE THAT WHOLE ALBUM SLAPS", author: "Cliff" },
    ]);
  });

  it("should credit an old comment to the user who signed it, and keep the rest as written", async () => {
    expect(
      await rows(
        `select n.body, u.name author from song_lists.song_notes n
         join song_lists.songs s on s.id = n.song_id
         join song_lists.users u on u.id = n.created_by
         where s.title in ('Freak Like Me', 'Kryptonite') order by s.title, n.id`,
      ),
    ).toEqual([
      {
        body: "Yes, yes I am- Dr. Stankleberries, Freaky M.D.",
        author: "System",
      },
      { body: "Classic shit.", author: "Al" },
      {
        body: "Iiiiii, got a pocket full of kryptonite-Stank",
        author: "Cliff",
      },
    ]);
  });

  it("should credit a comment signed with a nickname to the user it belongs to, and keep the nickname", async () => {
    expect(
      await rows(
        `select n.body, u.name author from song_lists.song_notes n
         join song_lists.songs s on s.id = n.song_id
         join song_lists.users u on u.id = n.created_by
         where s.title = 'Call Me A Dog'`,
      ),
    ).toEqual([{ body: "Dog.  - Stan", author: "Cliff" }]);
  });

  it("should know Dr. Jelly Finger as one of Cliff's nicknames", async () => {
    expect(
      await rows(
        `select n.body, u.name author from song_lists.song_notes n
         join song_lists.songs s on s.id = n.song_id
         join song_lists.users u on u.id = n.created_by
         where s.title = 'Territorial Pissings'`,
      ),
    ).toEqual([{ body: "💖💕💕-Dr. Jelly Finger", author: "Cliff" }]);
  });

  it("should leave no signed-off comment credited to the System user when a seeded user signed it", async () => {
    expect(
      await rows(
        `select n.body from song_lists.song_notes n
         join song_lists.users u on u.id = n.created_by
         where u.name = 'System' and n.body ~* '\\s*-\\s*(al|cliff|stan|stank|stuff|stuffy|minnz|chad|ryan|judd|vic)$'`,
      ),
    ).toEqual([]);
  });

  it("should show Build Me Up Buttercup on The Foundations' 1968 album of that name, with its real cover", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         where s.title = 'Build Me Up Buttercup'`,
      ),
    ).toEqual([
      {
        source: "musicbrainz",
        artwork_url:
          "https://coverartarchive.org/release-group/fe4abd50-1b96-3810-8dd7-b92094dddf74/front",
        album_name: "Build Me Up Buttercup",
        release_year: 1968,
        matched_by: "manual",
      },
    ]);
  });

  it("should point Come On Let's Go at Ritchie Valens' 1958 single, with its label as the art", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Ritchie Valens' and s.title = 'Come On Let''s Go'`,
      ),
    ).toEqual([
      {
        source: null,
        artwork_url:
          "/album-art/ritchie-valens-come-on-let-s-go-framed-1958.jpg",
        album_name: "Come On, Let's Go / Framed",
        release_year: 1958,
        matched_by: "manual",
      },
    ]);
  });

  it("should put Danger Zone on the Top Gun soundtrack, which is also its film", async () => {
    expect(
      await rows(
        `select m.source, m.album_name, m.release_year, m.matched_by, p.name production
         from song_lists.songs s
         join song_lists.artists a on a.id = s.artist_id
         join song_lists.song_metadata m on m.song_id = s.id
         join song_lists.song_productions sp on sp.song_id = s.id
         join song_lists.productions p on p.id = sp.production_id
         where a.name = 'Kenny Loggins' and s.title = 'Danger Zone'`,
      ),
    ).toEqual([
      {
        source: "itunes",
        album_name: "Top Gun (Original Motion Picture Soundtrack)",
        release_year: 1986,
        matched_by: "manual",
        production: "Top Gun",
      },
    ]);
  });

  it("should seed Queen's Flash's Theme once, with Stuff as a second advocate since the day he added it", async () => {
    expect(
      await rows(
        `select s.title from song_lists.songs s
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Queen' and s.title like 'Flash%' order by s.title`,
      ),
    ).toEqual([{ title: "Flash's Theme" }]);
    expect(
      await rows(
        `select u.name, to_char(sa.created_at, 'YYYY-MM-DD') since
         from song_lists.song_advocates sa
         join song_lists.songs s on s.id = sa.song_id
         join song_lists.users u on u.id = sa.user_id
         where s.title = 'Flash''s Theme' order by sa.created_at`,
      ),
    ).toEqual([
      { name: "Al", since: "2020-09-24" },
      { name: "Stuff", since: "2021-02-03" },
    ]);
  });

  it("should point Great Balls Of Fire at Jerry Lee Lewis' 1957 EP, not a compilation", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Jerry Lee Lewis' and s.title = 'Great Balls Of Fire'`,
      ),
    ).toEqual([
      {
        source: "musicbrainz",
        artwork_url:
          "https://coverartarchive.org/release-group/b600cd34-1275-4641-abf5-dd9062951cbc/front",
        album_name: "The Great Ball of Fire",
        release_year: 1957,
        matched_by: "manual",
      },
    ]);
  });

  it("should show I Wanna Be Sedated with the cover of Road to Ruin itself, not its deluxe edition", async () => {
    expect(
      await rows(
        `select m.source_track_id, m.artwork_url, m.album_name, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Ramones' and s.title = 'I Wanna Be Sedated'`,
      ),
    ).toEqual([
      {
        source_track_id: "847960913",
        artwork_url:
          "https://is1-ssl.mzstatic.com/image/thumb/Music6/v4/c2/86/19/c28619a9-e26c-20f7-fef6-0d21412aefb4/603497909568.jpg/100x100bb.jpg",
        album_name: "Road To Ruin",
        matched_by: "auto",
      },
    ]);
  });

  it("should point Little Darlin' at The Diamonds' 1957 single, with its label as the art", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'The Diamonds' and s.title = 'Little Darlin'''`,
      ),
    ).toEqual([
      {
        source: null,
        artwork_url:
          "/album-art/the-diamonds-little-darlin-faithful-and-true-1957.jpg",
        album_name: "Little Darlin' / Faithful And True",
        release_year: 1957,
        matched_by: "manual",
      },
    ]);
  });

  it("should point Little Green Bag at George Baker Selection's 1969 single, with its sleeve as the art", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'George Baker Selection' and s.title = 'Little Green Bag'`,
      ),
    ).toEqual([
      {
        source: null,
        artwork_url:
          "/album-art/george-baker-selection-little-green-bag-pretty-little-dreamer-1969.jpg",
        album_name: "Little Green Bag / Pretty Little Dreamer",
        release_year: 1969,
        matched_by: "manual",
      },
    ]);
  });

  it.each([
    [
      "State Of Love And Trust",
      "Singles (Original Motion Picture Soundtrack)",
      1992,
    ],
    ["I've Got A Feeling", "Vault 9: Live In Seattle 12/8/93", 2019],
  ])("should put Pearl Jam's %s on %s", async (title, album, year) => {
    expect(
      await rows(
        `select m.source, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Pearl Jam' and s.title = $1`,
        [title],
      ),
    ).toEqual([
      {
        source: "itunes",
        album_name: album,
        release_year: year,
        matched_by: "manual",
      },
    ]);
  });

  it("should point The Trashmen's Surfin' Bird at their 1963 single, with its label as the art", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'The Trashmen' and s.title = 'Surfin'' Bird'`,
      ),
    ).toEqual([
      {
        source: null,
        artwork_url:
          "/album-art/the-trashmen-surfin-bird-king-of-the-surf-1963.jpg",
        album_name: "Surfin' Bird / King Of The Surf",
        release_year: 1963,
        matched_by: "manual",
      },
    ]);
  });

  it("should put the Stop Making Sense version of Take Me To The River on the Stop Making Sense album", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Talking Heads'
           and s.title = 'Take Me To The River (Stop Making Sense Version)'`,
      ),
    ).toEqual([
      {
        source: "musicbrainz",
        artwork_url:
          "https://coverartarchive.org/release-group/2b85ba4e-53bf-4473-87f5-59d0b53020ad/front",
        album_name: "Stop Making Sense",
        release_year: 1984,
        matched_by: "manual",
      },
    ]);
  });

  it("should put We Don't Need Another Hero on the Mad Max Beyond Thunderdome soundtrack, as well as the film", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by, p.name production
         from song_lists.songs s
         join song_lists.artists a on a.id = s.artist_id
         join song_lists.song_metadata m on m.song_id = s.id
         join song_lists.song_productions sp on sp.song_id = s.id
         join song_lists.productions p on p.id = sp.production_id
         where a.name = 'Tina Turner'
           and s.title = 'We Don''t Need Another Hero (Thunderdome)'`,
      ),
    ).toEqual([
      {
        source: null,
        artwork_url:
          "/album-art/tina-turner-mad-max-beyond-thunderdome-original-motion-picture-soundtrack-1985.jpg",
        album_name:
          "Mad Max Beyond Thunderdome (Original Motion Picture Soundtrack)",
        release_year: 1985,
        matched_by: "manual",
        production: "Mad Max Beyond Thunderdome",
      },
    ]);
  });

  it('should credit You\'re The Best to Joe "Bean" Esposito, on the 1984 Karate Kid soundtrack', async () => {
    expect(
      await rows(
        `select a.name artist, m.source, m.album_name, m.release_year, m.matched_by
         from song_lists.songs s
         join song_lists.artists a on a.id = s.artist_id
         join song_lists.song_metadata m on m.song_id = s.id
         where s.title = 'You''re The Best'`,
      ),
    ).toEqual([
      {
        artist: 'Joe "Bean" Esposito',
        source: "itunes",
        album_name: "The Karate Kid (Original Motion Picture Soundtrack)",
        release_year: 1984,
        matched_by: "manual",
      },
    ]);
    expect(
      await rows(
        "select name from song_lists.artists where name = 'Joe Esposito'",
      ),
    ).toEqual([]);
  });

  it("should put Ça Plane Pour Moi on Plastic Bertrand's original album, not a later compilation", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         where s.title = 'Ça Plane Pour Moi'`,
      ),
    ).toEqual([
      {
        source: "itunes",
        artwork_url:
          "https://is1-ssl.mzstatic.com/image/thumb/Music/y2005/m09/d09/h08/mzi.fhqvulzd.tif/100x100bb.jpg",
        album_name: "An 1",
        release_year: 1977,
        matched_by: "manual",
      },
    ]);
  });

  it("should keep The Bad Touch's cover on our own server, since its Cover Art Archive image fails to load", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         where s.title = 'The Bad Touch'`,
      ),
    ).toEqual([
      {
        source: null,
        artwork_url: "/album-art/bloodhound-gang-hooray-for-boobies-1999.jpg",
        album_name: "Hooray For Boobies",
        release_year: 1999,
        matched_by: "manual",
      },
    ]);
  });

  it("should show Primal Scream's Rocks with the original neon-sign cover of Give Out But Don't Give Up", async () => {
    expect(
      await rows(
        `select m.source, m.artwork_url, m.album_name, m.release_year, m.matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Primal Scream' and s.title = 'Rocks'`,
      ),
    ).toEqual([
      {
        source: "musicbrainz",
        artwork_url:
          "https://coverartarchive.org/release-group/a9c9cda6-d92f-3022-9a54-0053e58eca25/front",
        album_name: "Give Out But Don't Give Up",
        release_year: 1994,
        matched_by: "manual",
      },
    ]);
  });

  it("should not seed two artists with the same name", async () => {
    expect(
      await rows(
        "select lower(name) from song_lists.artists group by lower(name) having count(*) > 1",
      ),
    ).toEqual([]);
  });

  it("should attribute every seeded row to a user who exists", async () => {
    // The foreign keys guarantee it; this fails loudly if one is ever dropped.
    for (const table of ["songs", "artists", "productions", "lists"]) {
      expect(
        await rows(
          `select t.id from song_lists.${table} t
           left join song_lists.users u on u.id = t.created_by
           where t.created_by is null or u.id is null`,
        ),
      ).toEqual([]);
    }
  });
});
