import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import users from "./users.js";

const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  resource_id: uuid("resource_id").defaultRandom().notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
});

const artistsRelations = relations(artists, ({ one }) => ({
  creator: one(users, {
    fields: [artists.createdBy],
    references: [users.id],
  }),
}));

export default artists;
export { artistsRelations };
