import { getTableConfig, pgTable, serial, uuid } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  actorColumns,
  auditColumns,
  timestampColumns,
} from "../../../../src/db/schema/columns.ts";

const target = pgTable("target", {
  id: uuid("id").defaultRandom().primaryKey(),
});

describe("timestampColumns", () => {
  const source = pgTable("timestamp_columns_fixture", {
    id: serial("id").primaryKey(),
    ...timestampColumns,
  });

  it("defines createdAt and updatedAt, both defaulting to now", () => {
    expect(Object.keys(timestampColumns)).toEqual(["createdAt", "updatedAt"]);
    expect(source.createdAt.notNull).toBe(true);
    expect(source.createdAt.hasDefault).toBe(true);
    expect(source.updatedAt.notNull).toBe(true);
    expect(source.updatedAt.hasDefault).toBe(true);
  });
});

describe("actorColumns", () => {
  const source = pgTable("actor_columns_fixture", {
    id: serial("id").primaryKey(),
    ...actorColumns(() => target.id),
  });

  it("defines createdBy and updatedBy as required references to the given column", () => {
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

describe("auditColumns", () => {
  const source = pgTable("audit_columns_fixture", {
    id: serial("id").primaryKey(),
    ...auditColumns(() => target.id),
  });

  it("combines timestampColumns and actorColumns", () => {
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
