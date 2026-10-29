import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  artistId,
  openAppDatabase,
  songId,
  userId,
} from "./support/app-database";

describe("the song search documents, kept in step by the database", () => {
  let pool: Pool;
  let al: string;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    al = await userId(pool, "Al");
  });

  afterAll(async () => {
    await pool.end();
  });

  /** The IDs of the songs whose document matches `tsquery`. */
  const matching = async (tsquery: string) => {
    const { rows } = await pool.query<{ song_id: number }>(
      `select song_id from song_lists.song_search
       where document @@ to_tsquery('song_lists.song_search', $1)
       order by song_id`,
      [tsquery],
    );

    return rows.map((row) => row.song_id);
  };

  const addSong = async (title: string, artist: number) => {
    const { rows } = await pool.query<{ id: number }>(
      `insert into song_lists.songs (title, artist_id, created_by, updated_by)
       values ($1, $2, $3, $3) returning id`,
      [title, artist, al],
    );
    const [row] = rows;

    if (!row) {
      throw new Error("The song should have been added");
    }

    return row.id;
  };

  const addArtist = async (name: string) => {
    const { rows } = await pool.query<{ id: number }>(
      `insert into song_lists.artists (name, created_by, updated_by)
       values ($1, $2, $2) returning id`,
      [name, al],
    );
    const [row] = rows;

    if (!row) {
      throw new Error("The artist should have been added");
    }

    return row.id;
  };

  it("should have a document for every song the migrations seeded", async () => {
    const { rows } = await pool.query<{ missing: string }>(
      `select count(*) missing from song_lists.songs s
       where not exists (
         select 1 from song_lists.song_search d where d.song_id = s.id
       )`,
    );

    expect(Number(rows[0]?.missing)).toBe(0);
  });

  it("should read a symbol used as a letter as that letter", async () => {
    const id = await songId(pool, "Paper Trail$", "Too $hort").catch(
      () => null,
    );
    const trails = await matching("trails");
    const short = await matching("short");
    const tooShort = await artistId(pool, "Too $hort");
    const { rows } = await pool.query<{ id: number }>(
      "select id from song_lists.songs where artist_id = $1",
      [tooShort],
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(short).toEqual(expect.arrayContaining(rows.map((row) => row.id)));

    if (id !== null) {
      expect(trails).toContain(id);
    }
  });

  it("should find a word by what is left once accents are dropped", async () => {
    const artist = await addArtist("Beyoncé");
    const id = await addSong("Halo", artist);

    expect(await matching("beyonce")).toEqual([id]);
    expect(await matching("beyoncé")).toEqual([id]);
  });

  it("should keep words a language-aware search would throw away", async () => {
    const artist = await addArtist("The The");
    const id = await addSong("Don't Stop", artist);

    // "the" is a stop word to a language-aware search and would be dropped.
    expect(await matching("the & the & don & stop")).toContain(id);
  });

  it("should add a song as it is created", async () => {
    const artist = await addArtist("Zebra Mothers");
    const id = await addSong("Quiet Quokka", artist);

    expect(await matching("quokka & zebra")).toEqual([id]);
  });

  it("should follow a song's title when it changes", async () => {
    const artist = await addArtist("Marmot Choir");
    const id = await addSong("Old Name", artist);

    await pool.query(
      "update song_lists.songs set title = 'Fresh Title' where id = $1",
      [id],
    );

    expect(await matching("old")).not.toContain(id);
    expect(await matching("fresh & title")).toEqual([id]);
  });

  it("should not search a song's bio or its notes", async () => {
    const artist = await addArtist("Tapir Society");
    const id = await addSong("Plain Title", artist);

    await pool.query(
      "update song_lists.songs set bio = 'a lemur appears' where id = $1",
      [id],
    );
    await pool.query(
      `insert into song_lists.song_notes (song_id, body, created_by, updated_by)
       values ($1, 'an armadillo cameo', $2, $2)`,
      [id, al],
    );

    expect(await matching("lemur")).not.toContain(id);
    expect(await matching("armadillo")).not.toContain(id);
  });

  it("should follow a song to a new artist", async () => {
    const before = await addArtist("Walrus Union");
    const after = await addArtist("Narwhal Guild");
    const id = await addSong("Tusk Song", before);

    await pool.query(
      "update song_lists.songs set artist_id = $2 where id = $1",
      [id, after],
    );

    expect(await matching("walrus")).toEqual([]);
    expect(await matching("narwhal & tusk")).toEqual([id]);
  });

  it("should rename an artist across every song of theirs", async () => {
    const artist = await addArtist("Gecko Trio");
    const first = await addSong("Wall Climb", artist);
    const second = await addSong("Ceiling Walk", artist);

    await pool.query(
      "update song_lists.artists set name = 'Iguana Trio' where id = $1",
      [artist],
    );

    expect(await matching("gecko")).toEqual([]);
    expect(await matching("iguana")).toEqual([first, second]);
  });

  it("should include featured artists, and drop them again", async () => {
    const main = await addArtist("Heron Duo");
    const featured = await addArtist("Plover Kid");
    const id = await addSong("Shoreline", main);

    const { rows } = await pool.query<{ id: number }>(
      `insert into song_lists.song_featured_artists (song_id, artist_id, created_by, updated_by)
       values ($1, $2, $3, $3) returning id`,
      [id, featured, al],
    );
    expect(await matching("plover & shoreline")).toEqual([id]);

    await pool.query(
      "update song_lists.artists set name = 'Sandpiper Kid' where id = $1",
      [featured],
    );
    expect(await matching("plover")).toEqual([]);
    expect(await matching("sandpiper & heron")).toEqual([id]);

    await pool.query(
      "delete from song_lists.song_featured_artists where id = $1",
      [rows[0]?.id],
    );
    expect(await matching("sandpiper")).toEqual([]);
  });

  it("should include the album a lookup found, and follow it", async () => {
    const artist = await addArtist("Lynx Ensemble");
    const id = await addSong("Night Prowl", artist);

    await pool.query(
      `insert into song_lists.song_metadata
         (song_id, status, source, album_name, details_matched_by, artwork_matched_by, fetched_at, created_by, updated_by)
       values ($1, 'matched', 'itunes', 'Moonlit Fields', 'auto', 'auto', now(), $2, $2)`,
      [id, al],
    );
    expect(await matching("moonlit & prowl")).toEqual([id]);

    await pool.query(
      "update song_lists.song_metadata set album_name = 'Sunlit Fields' where song_id = $1",
      [id],
    );
    expect(await matching("moonlit")).toEqual([]);
    expect(await matching("sunlit")).toEqual([id]);

    await pool.query(
      "delete from song_lists.song_metadata where song_id = $1",
      [id],
    );
    expect(await matching("sunlit")).toEqual([]);
  });

  it("should include a song's advocates, and follow their names", async () => {
    const artist = await addArtist("Ibex Society");
    const id = await addSong("Cliff Edge", artist);
    const advocate = await pool.query<{ id: string }>(
      `insert into song_lists.users (email, name, created_by, updated_by)
       values ('zephyrine@example.test', 'Zephyrine', $1, $1) returning id`,
      [al],
    );
    const zephyrine = advocate.rows[0]?.id;

    await pool.query(
      `insert into song_lists.song_advocates (song_id, user_id, created_by, updated_by)
       values ($1, $2, $3, $3)`,
      [id, zephyrine, al],
    );
    expect(await matching("zephyrine & cliff")).toEqual([id]);

    await pool.query(
      "update song_lists.users set name = 'Wilhelmina' where id = $1",
      [zephyrine],
    );
    expect(await matching("zephyrine")).toEqual([]);
    expect(await matching("wilhelmina")).toEqual([id]);

    await pool.query(
      "delete from song_lists.song_advocates where song_id = $1",
      [id],
    );
    expect(await matching("wilhelmina")).toEqual([]);
  });

  it("should rank a title above an artist's name that says the same word", async () => {
    const artist = await addArtist("Pinecone Band");
    const inArtist = await addSong("Something Else", artist);
    const inTitle = await addSong("Pinecone", await addArtist("Okapi Band"));

    const { rows } = await pool.query<{ song_id: number }>(
      `select song_id from song_lists.song_search, to_tsquery('song_lists.song_search', 'pinecone') q
       where document @@ q order by ts_rank_cd(document, q) desc`,
    );

    expect(rows.map((row) => row.song_id)).toEqual([inTitle, inArtist]);
  });

  it("should not put productions in the document", async () => {
    const { rows } = await pool.query<{ song_id: number }>(
      `select sp.song_id from song_lists.song_productions sp
       join song_lists.productions p on p.id = sp.production_id
       where p.name = 'Heavy Metal' limit 1`,
    );
    const heavyMetalSong = rows[0]?.song_id;
    const { rows: titles } = await pool.query<{
      title: string;
      artist: string;
    }>(
      `select s.title, a.name artist from song_lists.songs s
       join song_lists.artists a on a.id = s.artist_id where s.id = $1`,
      [heavyMetalSong],
    );
    const ownWords = `${titles[0]?.title} ${titles[0]?.artist}`.toLowerCase();

    expect(heavyMetalSong).toBeDefined();
    // "Metal" is the production's word; skip if the song happens to say it too.
    if (!ownWords.includes("metal")) {
      expect(await matching("heavy & metal")).not.toContain(heavyMetalSong);
    }
  });

  it("should remove a song's document with the song", async () => {
    const artist = await addArtist("Yak Orchestra");
    const id = await addSong("Highland", artist);
    expect(await matching("highland")).toEqual([id]);

    await pool.query("delete from song_lists.songs where id = $1", [id]);

    expect(await matching("highland")).toEqual([]);
  });
});
