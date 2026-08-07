import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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

const users = pgTable("users", {
  id: uuidV7().primaryKey(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  name: text().notNull(),
  firstName: text(),
  lastName: text(),
  role: text().default(USER_ROLE.USER).notNull(),
  bio: text(),
  ...timestampColumns,
  createdBy: uuid().references((): AnyPgColumn => users.id),
  updatedBy: uuid().references((): AnyPgColumn => users.id),
});

const usersRelations = relations(users, ({ one, many }) => ({
  createdArtists: many(artists, { relationName: "artistCreator" }),
  updatedArtists: many(artists, { relationName: "artistUpdater" }),
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

const artists = pgTable("artists", {
  id: serial().primaryKey(),
  resource_id: uuidV7().notNull().unique(),
  name: text().notNull(),
  ...auditColumns(),
});

const artistsRelations = relations(artists, ({ one }) => ({
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

export {
  actorColumns,
  auditColumns,
  timestampColumns,
  uuidV7,
  users,
  USER_ROLE,
  usersRelations,
  artists,
  artistsRelations,
};
