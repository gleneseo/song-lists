-- Custom SQL migration file, put your code below! --
-- Search, in two kinds. Trigram similarity gives typo-tolerant "search as you
-- type" against artists, productions, and songs (used by the Add Song page)
-- rather than a client-side fuzzy-match library. Full-text search gives "all
-- of these words, in any order, across fields" over a song's title, artist,
-- featured artists, album, and advocates, kept in song_lists.song_search
-- (one document per song) and rebuilt by triggers whenever anything it's built
-- from changes -- including by the seed migrations that follow.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS artists_name_trgm_idx ON song_lists.artists USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productions_name_trgm_idx ON song_lists.productions USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS songs_title_trgm_idx ON song_lists.songs USING gin (title gin_trgm_ops);
--> statement-breakpoint

CREATE TABLE "song_lists"."song_search" (
	"song_id" integer PRIMARY KEY NOT NULL,
	"document" "tsvector" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "song_lists"."song_search" ADD CONSTRAINT "song_search_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "song_lists"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "song_search_document_idx" ON "song_lists"."song_search" USING gin ("document");
--> statement-breakpoint

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
--> statement-breakpoint

-- Titles and names aren't prose, so no stemming and no stop words ("Don't
-- Stop", "The The"): 'simple' keeps every word. unaccent makes "Beyonce" find
-- "Beyoncé".
CREATE TEXT SEARCH CONFIGURATION song_lists.song_search (COPY = pg_catalog.simple);
--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION song_lists.song_search
  ALTER MAPPING FOR hword, hword_part, word WITH public.unaccent, pg_catalog.simple;
--> statement-breakpoint

-- The database's twin of readSymbols() in apps/web-next/lib/text/read-symbols.ts
-- (and readSymbolsSql, which spells the same patterns inline): "$" and "!" used
-- as letters read as the "s" and "i" they stand for. The patterns must stay in
-- step with those.
CREATE FUNCTION song_lists.read_symbols(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT regexp_replace(regexp_replace(t, '\$(?!\d)', 's', 'g'), '!(?=\w)', 'i', 'g')
$$;
--> statement-breakpoint

-- Rebuilds one song's document. Weights, highest first: title (A); artist and
-- featured artists (B); album and advocates (C). Productions are
-- left out on purpose -- only some lists show them, so they're matched apart.
CREATE FUNCTION song_lists.refresh_song_search(p_song_id integer) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO song_lists.song_search (song_id, document)
  SELECT
    s.id,
    setweight(to_tsvector('song_lists.song_search', song_lists.read_symbols(s.title)), 'A') ||
    setweight(to_tsvector('song_lists.song_search', song_lists.read_symbols(a.name)), 'B') ||
    setweight(to_tsvector('song_lists.song_search', song_lists.read_symbols(coalesce((
      SELECT string_agg(fa.name, ' ')
      FROM song_lists.song_featured_artists sf
      JOIN song_lists.artists fa ON fa.id = sf.artist_id
      WHERE sf.song_id = s.id
    ), ''))), 'B') ||
    setweight(to_tsvector('song_lists.song_search', song_lists.read_symbols(coalesce(m.album_name, ''))), 'C') ||
    setweight(to_tsvector('song_lists.song_search', coalesce((
      SELECT string_agg(u.name, ' ')
      FROM song_lists.song_advocates sa
      JOIN song_lists.users u ON u.id = sa.user_id
      WHERE sa.song_id = s.id
    ), '')), 'C')
  FROM song_lists.songs s
  JOIN song_lists.artists a ON a.id = s.artist_id
  LEFT JOIN song_lists.song_metadata m ON m.song_id = s.id
  WHERE s.id = p_song_id
  ON CONFLICT (song_id) DO UPDATE SET document = EXCLUDED.document
$$;
--> statement-breakpoint

-- One trigger function for every table a document is built from: it works out
-- which songs the changed row touches (before and after, for a row that moved
-- from one song to another) and rebuilds each of them.
CREATE FUNCTION song_lists.song_search_touch() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  song_ids integer[] := '{}';
  song_id integer;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    song_ids := song_ids || song_lists.song_search_songs_of(TG_TABLE_NAME, to_jsonb(NEW));
  END IF;
  IF TG_OP <> 'INSERT' THEN
    song_ids := song_ids || song_lists.song_search_songs_of(TG_TABLE_NAME, to_jsonb(OLD));
  END IF;

  FOR song_id IN SELECT DISTINCT unnest(song_ids) LOOP
    PERFORM song_lists.refresh_song_search(song_id);
  END LOOP;

  RETURN NULL;
END
$$;
--> statement-breakpoint

-- The songs whose documents a changed row of `source` (as JSON) feeds.
CREATE FUNCTION song_lists.song_search_songs_of(source text, changed jsonb) RETURNS integer[]
LANGUAGE sql STABLE AS $$
  SELECT CASE source
    WHEN 'songs' THEN ARRAY[(changed->>'id')::integer]
    WHEN 'song_metadata' THEN ARRAY[(changed->>'song_id')::integer]
    WHEN 'song_featured_artists' THEN ARRAY[(changed->>'song_id')::integer]
    WHEN 'song_advocates' THEN ARRAY[(changed->>'song_id')::integer]
    -- An artist's name is in the document of every song they made, or are on.
    WHEN 'artists' THEN ARRAY(
      SELECT s.id FROM song_lists.songs s WHERE s.artist_id = (changed->>'id')::integer
      UNION
      SELECT sf.song_id FROM song_lists.song_featured_artists sf WHERE sf.artist_id = (changed->>'id')::integer
    )
    -- Likewise a user's name, for the songs they advocate.
    WHEN 'users' THEN ARRAY(
      SELECT sa.song_id FROM song_lists.song_advocates sa WHERE sa.user_id = (changed->>'id')::uuid
    )
  END
$$;
--> statement-breakpoint

CREATE TRIGGER song_search_songs
  AFTER INSERT OR UPDATE OF title, artist_id ON song_lists.songs
  FOR EACH ROW EXECUTE FUNCTION song_lists.song_search_touch();
--> statement-breakpoint
CREATE TRIGGER song_search_artists
  AFTER UPDATE OF name ON song_lists.artists
  FOR EACH ROW EXECUTE FUNCTION song_lists.song_search_touch();
--> statement-breakpoint
CREATE TRIGGER song_search_song_metadata
  AFTER INSERT OR UPDATE OF album_name, song_id OR DELETE ON song_lists.song_metadata
  FOR EACH ROW EXECUTE FUNCTION song_lists.song_search_touch();
--> statement-breakpoint
CREATE TRIGGER song_search_song_featured_artists
  AFTER INSERT OR UPDATE OF song_id, artist_id OR DELETE ON song_lists.song_featured_artists
  FOR EACH ROW EXECUTE FUNCTION song_lists.song_search_touch();
--> statement-breakpoint
CREATE TRIGGER song_search_song_advocates
  AFTER INSERT OR UPDATE OF song_id, user_id OR DELETE ON song_lists.song_advocates
  FOR EACH ROW EXECUTE FUNCTION song_lists.song_search_touch();
--> statement-breakpoint
CREATE TRIGGER song_search_users
  AFTER UPDATE OF name ON song_lists.users
  FOR EACH ROW EXECUTE FUNCTION song_lists.song_search_touch();
--> statement-breakpoint
