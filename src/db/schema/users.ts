import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import artists from "./artists.ts";

const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
  MANAGER: "manager",
} as const;

const userRole = pgEnum(
  "user_role",
  Object.values(USER_ROLE) as [string, ...string[]],
);

const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  displayName: text("display_name").unique(),
  role: userRole("role").default(USER_ROLE.USER).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const usersRelations = relations(users, ({ many }) => ({
  artists: many(artists),
}));

export default users;
export { USER_ROLE, usersRelations };
