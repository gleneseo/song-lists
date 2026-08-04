import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import artists from "./artists.ts";

const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
  MANAGER: "manager",
} as const;

const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default(USER_ROLE.USER).notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export default users;
export { USER_ROLE, usersRelations };
