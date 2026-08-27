import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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

const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
  MANAGER: "manager",
} as const;

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
  originalSongId: integer().references((): AnyPgColumn => songs.id),
  bio: text(),
  ...auditColumns(),
});

const songsRelations = relations(songs, ({ one, many }) => ({
  artist: one(artists, {
    fields: [songs.artistId],
    references: [artists.id],
  }),
  originalSong: one(songs, {
    fields: [songs.originalSongId],
    references: [songs.id],
    relationName: "songOriginal",
  }),
  covers: many(songs, { relationName: "songOriginal" }),
  featuredArtists: many(songFeaturedArtists),
  productions: many(songProductions),
  advocates: many(songAdvocates),
  lists: many(listSongs),
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
  (table) => [unique().on(table.songId, table.artistId)],
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
  (table) => [unique().on(table.songId, table.productionId)],
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
  (table) => [unique().on(table.songId, table.userId)],
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
 * models. `id` uses uuidV7() (not Better Auth's default random string id) to
 * match the rest of this schema; authConfig sets advanced.database.generateId
 * to false so Better Auth defers to the database default instead of
 * generating its own id.
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
  (table) => [index().on(table.userId)],
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
  USER_ROLE,
  usersRelations,
  artists,
  artistsRelations,
  songs,
  songsRelations,
  songFeaturedArtists,
  songFeaturedArtistsRelations,
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
