import { sql } from "drizzle-orm";
import { type AnyPgColumn, timestamp, uuid } from "drizzle-orm/pg-core";

const timestampColumns = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

function uuidV7(name: string) {
  return uuid(name).default(sql`uuidv7()`);
}

function actorColumns(getActorId: () => AnyPgColumn) {
  return {
    createdBy: uuid("created_by").notNull().references(getActorId),
    updatedBy: uuid("updated_by").notNull().references(getActorId),
  };
}

function auditColumns(getActorId: () => AnyPgColumn) {
  return {
    ...timestampColumns,
    ...actorColumns(getActorId),
  };
}

export { actorColumns, auditColumns, timestampColumns, uuidV7 };
