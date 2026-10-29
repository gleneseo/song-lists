import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  customType,
  index,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { USER_ROLE } from "../user-role.js";

const songListsSchema = pgSchema("song_lists");

const timestampColumns = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
};

function uuidV7() {
  return uuid().default(sql`uuidv7()`);
}

/**
 * Column builders are mutable, and .references() is consumed per-table when
 * Drizzle builds a table's foreign keys. Unlike timestampColumns, whose
 * columns never call .references(), these must be functions rather than
 * shared constants so every table that spreads them gets its own builder
 * instances instead of reusing the same ones across tables.
 */
function actorColumns() {
  return {
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    updatedBy: uuid()
      .notNull()
      .references(() => users.id),
  };
}

function auditColumns() {
  return {
    ...timestampColumns,
    ...actorColumns(),
  };
}

const users = songListsSchema.table("users", {
  id: uuidV7().primaryKey(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  name: text().notNull(),
  firstName: text(),
  lastName: text(),
  role: text().default(USER_ROLE.USER).notNull(),
  bio: text(),
  image: text(),
  /** When an admin deactivated the account, or `null` while it's active. */
  deactivatedAt: timestamp(),
  ...timestampColumns,
  createdBy: uuid().references((): AnyPgColumn => users.id),
  updatedBy: uuid().references((): AnyPgColumn => users.id),
});

const usersRelations = relations(users, ({ one, many }) => ({
  createdArtists: many(artists, { relationName: "artistCreator" }),
  updatedArtists: many(artists, { relationName: "artistUpdater" }),
  createdSongs: many(songs, { relationName: "songCreator" }),
  updatedSongs: many(songs, { relationName: "songUpdater" }),
  createdSongFeaturedArtists: many(songFeaturedArtists, {
    relationName: "songFeaturedArtistCreator",
  }),
  updatedSongFeaturedArtists: many(songFeaturedArtists, {
    relationName: "songFeaturedArtistUpdater",
  }),
  createdSongNotes: many(songNotes, { relationName: "songNoteCreator" }),
  updatedSongNotes: many(songNotes, { relationName: "songNoteUpdater" }),
  createdSongMetadata: many(songMetadata, {
    relationName: "songMetadataCreator",
  }),
  updatedSongMetadata: many(songMetadata, {
    relationName: "songMetadataUpdater",
  }),
  createdSongCovers: many(songCovers, {
    relationName: "songCoverCreator",
  }),
  updatedSongCovers: many(songCovers, {
    relationName: "songCoverUpdater",
  }),
  createdSongProductions: many(songProductions, {
    relationName: "songProductionCreator",
  }),
  updatedSongProductions: many(songProductions, {
    relationName: "songProductionUpdater",
  }),
  advocatedSongs: many(songAdvocates, { relationName: "songAdvocateUser" }),
  createdSongAdvocates: many(songAdvocates, {
    relationName: "songAdvocateCreator",
  }),
  updatedSongAdvocates: many(songAdvocates, {
    relationName: "songAdvocateUpdater",
  }),
  createdLists: many(lists, { relationName: "listCreator" }),
  updatedLists: many(lists, { relationName: "listUpdater" }),
  createdListSongs: many(listSongs, { relationName: "listSongCreator" }),
  updatedListSongs: many(listSongs, { relationName: "listSongUpdater" }),
  createdProductionTypes: many(productionTypes, {
    relationName: "productionTypeCreator",
  }),
  updatedProductionTypes: many(productionTypes, {
    relationName: "productionTypeUpdater",
  }),
  createdProductions: many(productions, {
    relationName: "productionCreator",
  }),
  updatedProductions: many(productions, {
    relationName: "productionUpdater",
  }),
  sessions: many(sessions),
  accounts: many(accounts),
  creator: one(users, {
    fields: [users.createdBy],
    references: [users.id],
    relationName: "userCreator",
  }),
  updater: one(users, {
    fields: [users.updatedBy],
    references: [users.id],
    relationName: "userUpdater",
  }),
}));

const artists = songListsSchema.table("artists", {
  id: serial().primaryKey(),
  resource_id: uuidV7().notNull().unique(),
  name: text().notNull(),
  ...auditColumns(),
});

const artistsRelations = relations(artists, ({ one, many }) => ({
  songs: many(songs),
  featuredOnSongs: many(songFeaturedArtists),
  creator: one(users, {
    fields: [artists.createdBy],
    references: [users.id],
    relationName: "artistCreator",
  }),
  updater: one(users, {
    fields: [artists.updatedBy],
    references: [users.id],
    relationName: "artistUpdater",
  }),
}));

const songs = songListsSchema.table("songs", {
  id: serial().primaryKey(),
  resource_id: uuidV7().notNull().unique(),
  title: text().notNull(),
  artistId: integer()
    .notNull()
    .references(() => artists.id),
  /** An actual bio for the song, if someone has one to write; its notes are in `song_notes`. Neither is searched. */
  bio: text(),
  ...auditColumns(),
});

const songsRelations = relations(songs, ({ one, many }) => ({
  artist: one(artists, {
    fields: [songs.artistId],
    references: [artists.id],
  }),
  coverOf: many(songCovers, { relationName: "songCoverSong" }),
  coveredBy: many(songCovers, { relationName: "songCoverOriginal" }),
  featuredArtists: many(songFeaturedArtists),
  productions: many(songProductions),
  advocates: many(songAdvocates),
  notes: many(songNotes),
  lists: many(listSongs),
  metadata: one(songMetadata),
  creator: one(users, {
    fields: [songs.createdBy],
    references: [users.id],
    relationName: "songCreator",
  }),
  updater: one(users, {
    fields: [songs.updatedBy],
    references: [users.id],
    relationName: "songUpdater",
  }),
}));

/**
 * One note on a song. `createdBy` is who wrote it and `createdAt` when, so a
 * note needs no signature in its text. Notes show oldest first (by `id`, which
 * the migration that moved them out of `songs.bio` kept in their old order).
 */
const songNotes = songListsSchema.table(
  "song_notes",
  {
    id: serial().primaryKey(),
    resource_id: uuidV7().notNull().unique(),
    songId: integer()
      .notNull()
      .references(() => songs.id),
    body: text().notNull(),
    ...auditColumns(),
  },
  (table) => [index("song_notes_song_id_idx").on(table.songId)],
);

const songNotesRelations = relations(songNotes, ({ one }) => ({
  song: one(songs, {
    fields: [songNotes.songId],
    references: [songs.id],
  }),
  creator: one(users, {
    fields: [songNotes.createdBy],
    references: [users.id],
    relationName: "songNoteCreator",
  }),
  updater: one(users, {
    fields: [songNotes.updatedBy],
    references: [users.id],
    relationName: "songNoteUpdater",
  }),
}));

/**
 * What an outside music service knows about a song, looked up automatically.
 * It lives apart from `songs` so what people write stays separate from what
 * a machine fetched, and a song may have no row here at all (not looked up
 * yet).
 */
const songMetadata = songListsSchema.table("song_metadata", {
  id: serial().primaryKey(),
  resource_id: uuidV7().notNull().unique(),
  songId: integer()
    .notNull()
    .unique("song_metadata_song_id_unique")
    .references(() => songs.id),
  /** One of `SONG_METADATA_STATUS`. */
  status: text().notNull(),
  /** One of `SONG_METADATA_SOURCE`; `null` unless a source answered. */
  source: text(),
  /** The source's own ID for the track, so a refresh can ask for it exactly. */
  sourceTrackId: text(),
  /**
   * Where the source serves the cover art. A base URL: the size is chosen
   * where it's shown.
   */
  artworkUrl: text(),
  albumName: text(),
  releaseYear: integer(),
  /** One of `SONG_METADATA_MATCHED_BY`. */
  matchedBy: text().notNull(),
  /** When the lookup last ran. */
  fetchedAt: timestamp().notNull(),
  ...auditColumns(),
});

const songMetadataRelations = relations(songMetadata, ({ one }) => ({
  song: one(songs, {
    fields: [songMetadata.songId],
    references: [songs.id],
  }),
  creator: one(users, {
    fields: [songMetadata.createdBy],
    references: [users.id],
    relationName: "songMetadataCreator",
  }),
  updater: one(users, {
    fields: [songMetadata.updatedBy],
    references: [users.id],
    relationName: "songMetadataUpdater",
  }),
}));

/** Postgres's full-text document type, which Drizzle has no builder for. */
const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/**
 * What full-text search matches a song against: its title, artist, featured
 * artists, album, and advocates, weighted by how much each says about
 * which song it is. Nothing writes here directly -- triggers rebuild a song's
 * row whenever anything it's built from changes (see the
 * `add_full_text_search` migration) -- so it exists in the schema only for
 * queries to join against. Productions are left out on purpose: only some
 * lists show them, so they're matched separately.
 */
const songSearch = songListsSchema.table(
  "song_search",
  {
    songId: integer()
      .primaryKey()
      .references(() => songs.id, { onDelete: "cascade" }),
    document: tsvector().notNull(),
  },
  (table) => [index("song_search_document_idx").using("gin", table.document)],
);

const songFeaturedArtists = songListsSchema.table(
  "song_featured_artists",
  {
    id: serial().primaryKey(),
    resource_id: uuidV7().notNull().unique(),
    songId: integer()
      .notNull()
      .references(() => songs.id),
    artistId: integer()
      .notNull()
      .references(() => artists.id),
    ...auditColumns(),
  },
  (table) => [
    unique("song_featured_artists_song_id_artist_id_unique").on(
      table.songId,
      table.artistId,
    ),
  ],
);

const songFeaturedArtistsRelations = relations(
  songFeaturedArtists,
  ({ one }) => ({
    song: one(songs, {
      fields: [songFeaturedArtists.songId],
      references: [songs.id],
    }),
    artist: one(artists, {
      fields: [songFeaturedArtists.artistId],
      references: [artists.id],
    }),
    creator: one(users, {
      fields: [songFeaturedArtists.createdBy],
      references: [users.id],
      relationName: "songFeaturedArtistCreator",
    }),
    updater: one(users, {
      fields: [songFeaturedArtists.updatedBy],
      references: [users.id],
      relationName: "songFeaturedArtistUpdater",
    }),
  }),
);

const songCovers = songListsSchema.table(
  "song_covers",
  {
    id: serial().primaryKey(),
    resource_id: uuidV7().notNull().unique(),
    songId: integer()
      .notNull()
      .references(() => songs.id),
    originalSongId: integer()
      .notNull()
      .references((): AnyPgColumn => songs.id),
    ...auditColumns(),
  },
  (table) => [
    unique("song_covers_song_id_original_song_id_unique").on(
      table.songId,
      table.originalSongId,
    ),
  ],
);

const songCoversRelations = relations(songCovers, ({ one }) => ({
  song: one(songs, {
    fields: [songCovers.songId],
    references: [songs.id],
    relationName: "songCoverSong",
  }),
  original: one(songs, {
    fields: [songCovers.originalSongId],
    references: [songs.id],
    relationName: "songCoverOriginal",
  }),
  creator: one(users, {
    fields: [songCovers.createdBy],
    references: [users.id],
    relationName: "songCoverCreator",
  }),
  updater: one(users, {
    fields: [songCovers.updatedBy],
    references: [users.id],
    relationName: "songCoverUpdater",
  }),
}));

const songProductions = songListsSchema.table(
  "song_productions",
  {
    id: serial().primaryKey(),
    resource_id: uuidV7().notNull().unique(),
    songId: integer()
      .notNull()
      .references(() => songs.id),
    productionId: integer()
      .notNull()
      .references(() => productions.id),
    ...auditColumns(),
  },
  (table) => [
    unique("song_productions_song_id_production_id_unique").on(
      table.songId,
      table.productionId,
    ),
  ],
);

const songProductionsRelations = relations(songProductions, ({ one }) => ({
  song: one(songs, {
    fields: [songProductions.songId],
    references: [songs.id],
  }),
  production: one(productions, {
    fields: [songProductions.productionId],
    references: [productions.id],
  }),
  creator: one(users, {
    fields: [songProductions.createdBy],
    references: [users.id],
    relationName: "songProductionCreator",
  }),
  updater: one(users, {
    fields: [songProductions.updatedBy],
    references: [users.id],
    relationName: "songProductionUpdater",
  }),
}));

const songAdvocates = songListsSchema.table(
  "song_advocates",
  {
    id: serial().primaryKey(),
    resource_id: uuidV7().notNull().unique(),
    songId: integer()
      .notNull()
      .references(() => songs.id),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    ...auditColumns(),
  },
  (table) => [
    unique("song_advocates_song_id_user_id_unique").on(
      table.songId,
      table.userId,
    ),
  ],
);

const songAdvocatesRelations = relations(songAdvocates, ({ one }) => ({
  song: one(songs, {
    fields: [songAdvocates.songId],
    references: [songs.id],
  }),
  advocate: one(users, {
    fields: [songAdvocates.userId],
    references: [users.id],
    relationName: "songAdvocateUser",
  }),
  creator: one(users, {
    fields: [songAdvocates.createdBy],
    references: [users.id],
    relationName: "songAdvocateCreator",
  }),
  updater: one(users, {
    fields: [songAdvocates.updatedBy],
    references: [users.id],
    relationName: "songAdvocateUpdater",
  }),
}));

const lists = songListsSchema.table("lists", {
  id: serial().primaryKey(),
  resource_id: uuidV7().notNull().unique(),
  name: text().notNull(),
  /**
   * Optional columns this list's page shows beyond the standard ones, as
   * names from LIST_EXTRA_COLUMN. Stored as free text and validated by the
   * apps, like `users.role`, so a new optional column needs no migration.
   */
  extraColumns: text().array().notNull().default([]),
  ...auditColumns(),
});

const listsRelations = relations(lists, ({ one, many }) => ({
  songs: many(listSongs),
  creator: one(users, {
    fields: [lists.createdBy],
    references: [users.id],
    relationName: "listCreator",
  }),
  updater: one(users, {
    fields: [lists.updatedBy],
    references: [users.id],
    relationName: "listUpdater",
  }),
}));

/**
 * createdAt is the default sort order, but Postgres's now() is stable for
 * the whole transaction, so a bulk insert into the same list can produce
 * tied timestamps. Sort by (createdAt, id) rather than createdAt alone -
 * id is a unique, insertion-ordered tiebreaker, so ties never make the
 * order ambiguous.
 */
const listSongs = songListsSchema.table("list_songs", {
  id: serial().primaryKey(),
  resource_id: uuidV7().notNull().unique(),
  listId: integer()
    .notNull()
    .references(() => lists.id),
  songId: integer()
    .notNull()
    .references(() => songs.id),
  ...auditColumns(),
});

const listSongsRelations = relations(listSongs, ({ one }) => ({
  list: one(lists, {
    fields: [listSongs.listId],
    references: [lists.id],
  }),
  song: one(songs, {
    fields: [listSongs.songId],
    references: [songs.id],
  }),
  creator: one(users, {
    fields: [listSongs.createdBy],
    references: [users.id],
    relationName: "listSongCreator",
  }),
  updater: one(users, {
    fields: [listSongs.updatedBy],
    references: [users.id],
    relationName: "listSongUpdater",
  }),
}));

const productionTypes = songListsSchema.table("production_types", {
  id: serial().primaryKey(),
  resource_id: uuidV7().notNull().unique(),
  name: text().notNull(),
  ...auditColumns(),
});

const productionTypesRelations = relations(
  productionTypes,
  ({ one, many }) => ({
    productions: many(productions),
    creator: one(users, {
      fields: [productionTypes.createdBy],
      references: [users.id],
      relationName: "productionTypeCreator",
    }),
    updater: one(users, {
      fields: [productionTypes.updatedBy],
      references: [users.id],
      relationName: "productionTypeUpdater",
    }),
  }),
);

const productions = songListsSchema.table("productions", {
  id: serial().primaryKey(),
  resource_id: uuidV7().notNull().unique(),
  name: text().notNull(),
  releaseYear: integer().notNull(),
  typeId: integer()
    .notNull()
    .references(() => productionTypes.id),
  ...auditColumns(),
});

const productionsRelations = relations(productions, ({ one, many }) => ({
  type: one(productionTypes, {
    fields: [productions.typeId],
    references: [productionTypes.id],
  }),
  songs: many(songProductions),
  creator: one(users, {
    fields: [productions.createdBy],
    references: [users.id],
    relationName: "productionCreator",
  }),
  updater: one(users, {
    fields: [productions.updatedBy],
    references: [users.id],
    relationName: "productionUpdater",
  }),
}));

/**
 * Fields required by Better Auth for its session, account, and verification
 * models. `id` uses uuidV7() (not Better Auth's default random string ID) to
 * match the rest of this schema; authConfig sets advanced.database.generateId
 * to false so Better Auth defers to the database default instead of
 * generating its own ID.
 */
const sessions = songListsSchema.table(
  "sessions",
  {
    id: uuidV7().primaryKey(),
    token: text().notNull().unique(),
    expiresAt: timestamp().notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestampColumns,
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index().on(table.userId)],
);

const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

const accounts = songListsSchema.table(
  "accounts",
  {
    id: uuidV7().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    issuer: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp(),
    refreshTokenExpiresAt: timestamp(),
    scope: text(),
    password: text(),
    ...timestampColumns,
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index().on(table.userId),
    unique("accounts_issuer_account_id_unique").on(
      table.issuer,
      table.accountId,
    ),
  ],
);

const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

const verifications = songListsSchema.table(
  "verifications",
  {
    id: uuidV7().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp().notNull(),
    ...timestampColumns,
  },
  (table) => [index().on(table.identifier)],
);

export {
  songListsSchema,
  actorColumns,
  auditColumns,
  timestampColumns,
  uuidV7,
  users,
  usersRelations,
  artists,
  artistsRelations,
  songs,
  songsRelations,
  songNotes,
  songNotesRelations,
  songMetadata,
  songMetadataRelations,
  songSearch,
  songFeaturedArtists,
  songFeaturedArtistsRelations,
  songCovers,
  songCoversRelations,
  songProductions,
  songProductionsRelations,
  songAdvocates,
  songAdvocatesRelations,
  lists,
  listsRelations,
  listSongs,
  listSongsRelations,
  productionTypes,
  productionTypesRelations,
  productions,
  productionsRelations,
  sessions,
  sessionsRelations,
  accounts,
  accountsRelations,
  verifications,
};
