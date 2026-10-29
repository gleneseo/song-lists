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

  it("should name the Isley Brothers' 1973 album 3 + 3 the same way for every song on it, and leave Seals & Crofts' Summer Breeze alone", async () => {
    expect(
      await rows(
        `select a.name artist, s.title, m.source_track_id, m.album_name, m.release_year, m.details_matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where s.title in ('Summer Breeze', 'That Lady, Pts. 1 & 2')
         order by a.name, s.title`,
      ),
    ).toEqual([
      {
        artist: "Seals & Crofts",
        title: "Summer Breeze",
        source_track_id: "303230013",
        album_name: "Summer Breeze",
        release_year: 1972,
        details_matched_by: "auto",
      },
      {
        artist: "The Isley Brothers",
        title: "Summer Breeze",
        source_track_id: "1030452487",
        album_name: "3 + 3",
        release_year: 1973,
        details_matched_by: "manual",
      },
      {
        artist: "The Isley Brothers",
        title: "That Lady, Pts. 1 & 2",
        source_track_id: "1030452446",
        album_name: "3 + 3",
        release_year: 1973,
        details_matched_by: "manual",
      },
    ]);
  });

  it("should give Centerfold and Freeze-Frame the same album, named the same way, with the same cover", async () => {
    expect(
      await rows(
        `select s.title, m.source, m.artwork_url, m.album_name, m.release_year
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'The J. Geils Band' and s.title in ('Centerfold', 'Freeze-Frame')
         order by s.title`,
      ),
    ).toEqual(
      ["Centerfold", "Freeze-Frame"].map((title) => ({
        title,
        source: "itunes",
        artwork_url:
          "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/4d/d2/5a/4dd25afd-4260-d593-e8c6-d1d9c2ea5112/14UMGIM11053.rgb.jpg/100x100bb.jpg",
        album_name: "Freeze-Frame",
        release_year: 1981,
      })),
    );
  });

  it("should show every Electric Ladyland song with the album's original, uncensored UK cover", async () => {
    expect(
      await rows(
        `select s.title, m.source, m.artwork_url, m.album_name, m.release_year, m.details_matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         where m.album_name = 'Electric Ladyland' order by s.title`,
      ),
    ).toEqual(
      [
        "All Along The Watchtower",
        "Crosstown Traffic",
        "Voodoo Child (Slight Return)",
      ].map((title) => ({
        title,
        source: null,
        artwork_url:
          "/album-art/the-jimi-hendrix-experience-electric-ladyland-1968.jpg",
        album_name: "Electric Ladyland",
        release_year: 1968,
        details_matched_by: "manual",
      })),
    );
  });

  it("should show John Fogerty's Centerfield songs with the original cover, not the 25th anniversary one", async () => {
    expect(
      await rows(
        `select s.title, m.source, m.artwork_url, m.album_name, m.release_year, m.details_matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'John Fogerty' and m.album_name = 'Centerfield'
         order by s.title`,
      ),
    ).toEqual(
      ["Centerfield", "The Old Man Down The Road"].map((title) => ({
        title,
        source: "musicbrainz",
        artwork_url:
          "https://coverartarchive.org/release-group/29de7d6b-599b-31e7-83e9-b6a4139c3f88/front",
        album_name: "Centerfield",
        release_year: 1985,
        details_matched_by: "manual",
      })),
    );
  });

  it("should put KRS-One's songs from his 1995 album KRS-One on it, with one cover and one spelling", async () => {
    expect(
      await rows(
        `select s.title, m.source, m.source_track_id, m.artwork_url, m.album_name, m.release_year, m.details_matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'KRS-One' and m.album_name ilike 'KRS%one'
         order by s.title`,
      ),
    ).toEqual(
      [
        ["Free Mumia", "254977338"],
        ["MC's Act Like They Don't Know", "254977164"],
      ].map(([title, track]) => ({
        title,
        source: "itunes",
        source_track_id: track,
        artwork_url:
          "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/01/56/9f/01569fdf-f9a0-9ad3-9612-8460f3de7967/mzi.ffogbhiq.jpg/100x100bb.jpg",
        album_name: "KRS-One",
        release_year: 1995,
        details_matched_by: "manual",
      })),
    );
  });

  it("should put Michael Jackson's songs from Off The Wall on that album, with its famous cover and not a compilation", async () => {
    expect(
      await rows(
        `select s.title, m.source_track_id, m.artwork_url, m.album_name, m.release_year
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Michael Jackson' and m.album_name = 'Off The Wall'
         order by s.title`,
      ),
    ).toEqual(
      [
        ["Don't Stop Til You Get Enough", "186166292"],
        ["Rock With You", "186166358"],
      ].map(([title, track]) => ({
        title,
        source_track_id: track,
        artwork_url:
          "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/0c/fe/a3/0cfea324-57c1-d530-5248-9bb591bbd7bf/074643574525.jpg/100x100bb.jpg",
        album_name: "Off The Wall",
        release_year: 1979,
      })),
    );
  });

  it("should give every People Under The Stairs song from O.S.T. the same cover", async () => {
    expect(
      await rows(
        `select s.title, m.source, m.artwork_url, m.release_year
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'People Under The Stairs' and m.album_name = 'O.S.T.'
         order by s.title`,
      ),
    ).toEqual(
      ["Acid Raindrops", "Montego Slay", "O.S.T. Intro", "The Hang Loose"].map(
        (title) => ({
          title,
          source: "itunes",
          artwork_url:
            "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/98/59/c3/9859c32d-3b7b-5d64-a1fc-42bcef0cc81a/600353020528_Cover.jpg/100x100bb.jpg",
          release_year: 2002,
        }),
      ),
    );
  });

  it("should put every People Under The Stairs song from The Next Step on it, Play It Again as its last track", async () => {
    expect(
      await rows(
        `select s.title, m.source_track_id, m.artwork_url, m.release_year
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'People Under The Stairs' and m.album_name = 'The Next Step'
         order by m.source_track_id::int`,
      ),
    ).toEqual(
      [
        ["San Francisco Knights", "2857200"],
        ["Time To Rock Our Shit", "2857213"],
        ["The Next Step II", "2857232"],
        ["Play It Again", "2857251"],
      ].map(([title, track]) => ({
        title,
        source_track_id: track,
        artwork_url:
          "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/03/e6/04/03e604d1-0929-7cf2-b19c-4ddfead69e57/s03.pvfbpyzz.jpg/100x100bb.jpg",
        release_year: 1998,
      })),
    );
  });

  it("should give Poison's Flesh & Blood songs the album's original, uncensored cover", async () => {
    expect(
      await rows(
        `select s.title, m.source, m.artwork_url, m.release_year, m.details_matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Poison' and m.album_name = 'Flesh & Blood'
         order by s.title`,
      ),
    ).toEqual(
      ["Ride The Wind", "Unskinny Bop"].map((title) => ({
        title,
        source: null,
        artwork_url: "/album-art/poison-flesh-blood-1990.jpg",
        release_year: 1990,
        details_matched_by: "manual",
      })),
    );
  });

  it("should put the Pretenders' Brass In Pocket and Kid on their 1980 album Pretenders, with one cover", async () => {
    expect(
      await rows(
        `select s.title, m.source_track_id, m.artwork_url, m.release_year
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'Pretenders' and m.album_name = 'Pretenders'
         order by s.title`,
      ),
    ).toEqual(
      [
        ["Brass In Pocket", "197211499"],
        ["Kid", "197211363"],
      ].map(([title, track]) => ({
        title,
        source_track_id: track,
        artwork_url:
          "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/93/5c/a6/935ca680-f52e-d7da-f736-5470e48880bf/mzi.klixczwp.jpg/100x100bb.jpg",
        release_year: 1980,
      })),
    );
  });

  it("should keep covers off the Cover Art Archive addresses that stopped loading, on iTunes or in our own files", async () => {
    const moved = await rows<{
      title: string;
      source: string | null;
      album_name: string;
      artwork_url: string;
    }>(
      `select s.title, m.source, m.album_name, m.artwork_url
       from song_lists.song_metadata m
       join song_lists.songs s on s.id = m.song_id
       where m.artwork_url ~ '^(https://is1-ssl.mzstatic.com|/album-art/)'
         and (
           (s.title, m.album_name) in (
             ('Baker Street', 'Next Year'),
             ('Self Suicide', 'Greatest Hits'),
             ('Guns Don''t Kill People, Rappers Do', 'Greatest Hits'),
             ('Cocaine Blues', 'Johnny Cash At Folsom Prison'),
             ('Swayin'' To The Music (Slow Dancin'')', 'Coast To Coast'),
             ('Jungle Boogie', 'Wild And Peaceful'),
             ('Banditos', 'Wheelie'),
             ('Live To Rise', 'Avengers Assemble (Music Inspired By The Motion Picture)'),
             ('Breathe', 'Avengers Assemble (Music Inspired By The Motion Picture)'),
             ('God Part II', 'Rattle And Hum'),
             ('Red Red Wine', 'Labour Of Love')
           )
         )
       order by s.title`,
    );

    expect(moved.map(({ title }) => title)).toEqual([
      "Baker Street",
      "Banditos",
      "Breathe",
      "Cocaine Blues",
      "God Part II",
      "Guns Don't Kill People, Rappers Do",
      "Jungle Boogie",
      "Live To Rise",
      "Red Red Wine",
      "Self Suicide",
      "Swayin' To The Music (Slow Dancin')",
    ]);
    expect(
      await rows(
        "select count(*)::int n from song_lists.song_metadata where artwork_url like '%coverartarchive.org/release-group/%' and (artwork_url like '%64817ce7%' or artwork_url like '%d6b8db26%' or artwork_url like '%6b4ea595%' or artwork_url like '%744f5ccb%' or artwork_url like '%db9b94e6%' or artwork_url like '%ad238e3a%' or artwork_url like '%3ef760ac%' or artwork_url like '%bf965ead%' or artwork_url like '%f1363399%')",
      ),
    ).toEqual([{ n: 0 }]);
  });

  it("should put every Sex Pistols song on the yellow UK Never Mind The Bollocks cover", async () => {
    expect(
      await rows(
        `select s.title, m.source, m.artwork_url, m.album_name, m.release_year, m.details_matched_by
         from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         join song_lists.artists a on a.id = s.artist_id
         where a.name = 'The Sex Pistols'
         order by s.title`,
      ),
    ).toEqual(
      [
        "Bodies",
        "E.M.I.",
        "Holidays In The Sun",
        "No Feelings",
        "Pretty Vacant",
      ].map((title) => ({
        title,
        source: null,
        artwork_url:
          "/album-art/sex-pistols-never-mind-the-bollocks-here-s-the-sex-pistols-1977.jpg",
        album_name: "Never Mind The Bollocks, Here's The Sex Pistols",
        release_year: 1977,
        details_matched_by: "manual",
      })),
    );
  });

  it("should show every Siamese Dream song with the original cover, not the reissue's", async () => {
    const songs = await rows<{ title: string; artwork_url: string }>(
      `select s.title, m.artwork_url
       from song_lists.song_metadata m
       join song_lists.songs s on s.id = m.song_id
       where m.album_name = 'Siamese Dream'
         and m.release_year = 1993`,
    );

    expect(songs.map(({ title }) => title).sort()).toEqual([
      "Cherub Rock",
      "Disarm",
      "Mayonaise",
      "Rocket",
      "Soma",
      "Spaceboy",
      "Today",
    ]);
    expect(new Set(songs.map(({ artwork_url }) => artwork_url))).toEqual(
      new Set(["/album-art/smashing-pumpkins-siamese-dream-1993.jpg"]),
    );
  });

  it("should show every Mellon Collie song with the original cover, not the reissue's", async () => {
    const songs = await rows<{ title: string; artwork_url: string }>(
      `select s.title, m.artwork_url
       from song_lists.song_metadata m
       join song_lists.songs s on s.id = m.song_id
       where m.album_name = 'Mellon Collie And The Infinite Sadness'
         and m.release_year = 1995`,
    );

    expect(songs.map(({ title }) => title).sort()).toEqual([
      "1979",
      "Bullet With Butterfly Wings",
      "Thirty-Three",
      "Tonight, Tonight",
      "Where Boys Fear To Tread",
      "X.Y.U.",
    ]);
    expect(new Set(songs.map(({ artwork_url }) => artwork_url))).toEqual(
      new Set([
        "/album-art/smashing-pumpkins-mellon-collie-and-the-infinite-sadness-1995.jpg",
      ]),
    );
  });

  it("should give every Sublime song on 40 Oz. To Freedom the same cover", async () => {
    const songs = await rows<{ artwork_url: string }>(
      `select m.artwork_url
       from song_lists.song_metadata m
       join song_lists.songs s on s.id = m.song_id
       join song_lists.artists a on a.id = s.artist_id
       where a.name = 'Sublime'
         and m.album_name = '40 Oz. To Freedom'
         and m.release_year = 1992`,
    );

    expect(songs.length).toBeGreaterThan(10);
    expect(new Set(songs.map(({ artwork_url }) => artwork_url)).size).toBe(1);
  });

  it("should give every Sublime song on Sublime the same, original cover", async () => {
    const songs = await rows<{ artwork_url: string }>(
      `select m.artwork_url
       from song_lists.song_metadata m
       join song_lists.songs s on s.id = m.song_id
       join song_lists.artists a on a.id = s.artist_id
       where a.name = 'Sublime'
         and m.album_name = 'Sublime'
         and m.release_year = 1996`,
    );

    expect(songs).toHaveLength(7);
    expect(new Set(songs.map(({ artwork_url }) => artwork_url)).size).toBe(1);
    expect(songs[0]?.artwork_url).toContain("06UMGIM01498");
  });

  it("should show every Crime Of The Century song with the original cover, not the deluxe edition's", async () => {
    const songs = await rows<{ title: string; artwork_url: string }>(
      `select s.title, m.artwork_url
       from song_lists.song_metadata m
       join song_lists.songs s on s.id = m.song_id
       where m.album_name = 'Crime Of The Century'
         and m.release_year = 1974`,
    );

    expect(songs.map(({ title }) => title).sort()).toEqual([
      "Another Man's Woman",
      "Bloody Well Right",
    ]);
    expect(new Set(songs.map(({ artwork_url }) => artwork_url))).toEqual(
      new Set(["/album-art/supertramp-crime-of-the-century-1974.jpg"]),
    );
  });

  it("should mark every seeded cover that is one of the app's own files as chosen by hand", async () => {
    expect(
      await rows(
        `select s.title from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
         where (m.artwork_url like '/album-art/%') <> (m.artwork_matched_by = 'manual')`,
      ),
    ).toEqual([]);
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
