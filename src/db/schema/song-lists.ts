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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

function uuidV7(name: string) {
  return uuid(name).default(sql`uuidv7()`);
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
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by")
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
  id: uuidV7("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default(USER_ROLE.USER).notNull(),
  bio: text("bio"),
  ...timestampColumns,
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedBy: uuid("updated_by").references((): AnyPgColumn => users.id),
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
  id: serial("id").primaryKey(),
  resource_id: uuidV7("resource_id").notNull().unique(),
  name: text("name").notNull(),
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
