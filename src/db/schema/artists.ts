import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { auditColumns, uuidV7 } from "./columns.js";
import users from "./users.js";

const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  resource_id: uuidV7("resource_id").notNull().unique(),
  name: text("name").notNull(),
  ...auditColumns(() => users.id),
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

export default artists;
export { artistsRelations };
