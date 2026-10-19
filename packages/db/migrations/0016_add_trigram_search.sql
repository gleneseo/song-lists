-- Custom SQL migration file, put your code below! --
-- Enables typo-tolerant "search as you type" against artists, productions,
-- and songs (used by the Add Song page) via Postgres trigram similarity,
-- rather than a client-side fuzzy-match library.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS artists_name_trgm_idx ON song_lists.artists USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS productions_name_trgm_idx ON song_lists.productions USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS songs_title_trgm_idx ON song_lists.songs USING gin (title gin_trgm_ops);
