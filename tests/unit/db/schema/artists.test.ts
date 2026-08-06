import {
  createTableRelationsHelpers,
  StringChunk,
  type SQL,
} from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import artists, {
  artistsRelations,
} from "../../../../src/db/schema/artists.js";
import users from "../../../../src/db/schema/users.js";

function findForeignKeyFrom(
  foreignKeys: ReturnType<typeof getTableConfig>["foreignKeys"],
  column: unknown,
) {
  return foreignKeys.find(
    (foreignKey) => foreignKey.reference().columns[0] === column,
  );
}

function defaultSqlText(defaultValue: SQL | string | undefined): string {
  if (typeof defaultValue === "string") {
    return defaultValue;
  }

  const [chunk] = defaultValue?.queryChunks ?? [];

  return chunk instanceof StringChunk ? chunk.value.join("") : "";
}

describe("artists", () => {
  it("should be stored under the table name artists", () => {
    const { name } = getTableConfig(artists);

    expect(name).toBe("artists");
  });

  it("should have exactly the expected set of columns", () => {
    const { columns } = getTableConfig(artists);
    const columnNames = columns.map((column) => column.name);

    expect(columnNames).toEqual([
      "id",
      "resource_id",
      "name",
      "created_at",
      "updated_at",
      "created_by",
      "updated_by",
    ]);
  });

  it("should be uniquely identified by a primary key", () => {
    expect(artists.id.primary).toBe(true);
  });

  it("should have a unique, randomly generated public identifier", () => {
    expect(artists.resource_id.notNull).toBe(true);
    expect(artists.resource_id.isUnique).toBe(true);
    expect(defaultSqlText(artists.resource_id.default)).toBe("uuidv7()");
  });

  it("should require a name", () => {
    expect(artists.name.notNull).toBe(true);
  });

  it("should record when it was created", () => {
    expect(artists.createdAt.notNull).toBe(true);
    expect(artists.createdAt.hasDefault).toBe(true);
  });

  it("should track which user created it", () => {
    const { foreignKeys } = getTableConfig(artists);
    const foreignKey = findForeignKeyFrom(foreignKeys, artists.createdBy);

    expect(artists.createdBy.notNull).toBe(true);
    expect(artists.createdBy.columnType).toBe(users.id.columnType);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
  });

  it("should record when it was last updated", () => {
    expect(artists.updatedAt.notNull).toBe(true);
    expect(artists.updatedAt.hasDefault).toBe(true);
  });

  it("should track which user last updated it", () => {
    const { foreignKeys } = getTableConfig(artists);
    const foreignKey = findForeignKeyFrom(foreignKeys, artists.updatedBy);

    expect(artists.updatedBy.notNull).toBe(true);
    expect(artists.updatedBy.columnType).toBe(users.id.columnType);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
  });

  it("should be linked back to who created and last updated it", () => {
    const helpers = createTableRelationsHelpers(artists);
    const { creator, updater } = artistsRelations.config(helpers);

    expect(creator.referencedTable).toBe(users);
    expect(updater.referencedTable).toBe(users);
  });
});
