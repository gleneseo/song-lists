import { StringChunk, type SQL } from "drizzle-orm";
import { getTableConfig, pgTable, serial, uuid } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  actorColumns,
  auditColumns,
  timestampColumns,
  uuidV7,
} from "../../../../src/db/schema/columns.js";

function defaultSqlText(defaultValue: SQL | string | undefined): string {
  if (typeof defaultValue === "string") {
    return defaultValue;
  }

  const [chunk] = defaultValue?.queryChunks ?? [];

  return chunk instanceof StringChunk ? chunk.value.join("") : "";
}

const target = pgTable("target", {
  id: uuid("id").defaultRandom().primaryKey(),
});

describe("columns", () => {
  describe("shared creation and update timestamps", () => {
    const source = pgTable("timestamp_columns_fixture", {
      id: serial("id").primaryKey(),
      ...timestampColumns,
    });

    it("should record both a creation time and a last-updated time, defaulting to now", () => {
      expect(Object.keys(timestampColumns)).toEqual(["createdAt", "updatedAt"]);
      expect(source.createdAt.notNull).toBe(true);
      expect(source.createdAt.hasDefault).toBe(true);
      expect(source.updatedAt.notNull).toBe(true);
      expect(source.updatedAt.hasDefault).toBe(true);
    });
  });

  describe("a randomly generated unique identifier", () => {
    const source = pgTable("uuid_v7_fixture", {
      id: uuidV7("id").primaryKey(),
    });

    it("should default to a new, time-ordered, unique value", () => {
      expect(source.id.columnType).toBe("PgUUID");
      expect(source.id.hasDefault).toBe(true);
      expect(defaultSqlText(source.id.default)).toBe("uuidv7()");
    });
  });

  describe("who created or updated a record", () => {
    const source = pgTable("actor_columns_fixture", {
      id: serial("id").primaryKey(),
      ...actorColumns(() => target.id),
    });

    it("should require tracking who created it and who last updated it", () => {
      const { foreignKeys } = getTableConfig(source);

      expect(source.createdBy.notNull).toBe(true);
      expect(source.updatedBy.notNull).toBe(true);
      expect(foreignKeys).toHaveLength(2);

      for (const foreignKey of foreignKeys) {
        const reference = foreignKey.reference();

        expect(reference.foreignTable).toBe(target);
        expect(reference.foreignColumns).toEqual([target.id]);
      }
    });
  });

  describe("the shared audit information on a record", () => {
    const source = pgTable("audit_columns_fixture", {
      id: serial("id").primaryKey(),
      ...auditColumns(() => target.id),
    });

    it("should track both when it changed and who changed it", () => {
      const { columns, foreignKeys } = getTableConfig(source);
      const columnNames = columns.map((column) => column.name);

      expect(columnNames).toEqual([
        "id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
      ]);
      expect(foreignKeys).toHaveLength(2);
    });
  });
});
