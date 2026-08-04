import { createTableRelationsHelpers } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import artists, {
  artistsRelations,
} from "../../../../src/db/schema/artists.ts";
import users from "../../../../src/db/schema/users.ts";

function findForeignKeyFrom(
  foreignKeys: ReturnType<typeof getTableConfig>["foreignKeys"],
  column: unknown,
) {
  return foreignKeys.find(
    (foreignKey) => foreignKey.reference().columns[0] === column,
  );
}

describe("artists", () => {
  it("is named artists", () => {
    const { name } = getTableConfig(artists);

    expect(name).toBe("artists");
  });

  it("defines the expected columns", () => {
    const { columns } = getTableConfig(artists);
    const columnNames = columns.map((column) => column.name);

    expect(columnNames).toEqual([
      "id",
      "resource_id",
      "name",
      "created_at",
      "created_by",
      "updated_at",
      "updated_by",
    ]);
  });

  it("has a primary key on id", () => {
    expect(artists.id.primary).toBe(true);
  });

  it("requires a unique resource_id", () => {
    expect(artists.resource_id.notNull).toBe(true);
    expect(artists.resource_id.isUnique).toBe(true);
    expect(artists.resource_id.hasDefault).toBe(true);
  });

  it("requires a name", () => {
    expect(artists.name.notNull).toBe(true);
  });

  it("defaults created_at to now", () => {
    expect(artists.createdAt.notNull).toBe(true);
    expect(artists.createdAt.hasDefault).toBe(true);
  });

  it("requires created_by and references the creating user", () => {
    const { foreignKeys } = getTableConfig(artists);
    const foreignKey = findForeignKeyFrom(foreignKeys, artists.createdBy);

    expect(artists.createdBy.notNull).toBe(true);
    expect(artists.createdBy.columnType).toBe(users.id.columnType);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
  });

  it("defaults updated_at to now", () => {
    expect(artists.updatedAt.notNull).toBe(true);
    expect(artists.updatedAt.hasDefault).toBe(true);
  });

  it("requires updated_by and references the last updating user", () => {
    const { foreignKeys } = getTableConfig(artists);
    const foreignKey = findForeignKeyFrom(foreignKeys, artists.updatedBy);

    expect(artists.updatedBy.notNull).toBe(true);
    expect(artists.updatedBy.columnType).toBe(users.id.columnType);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
  });

  it("relates each artist to its creator and last updater", () => {
    const helpers = createTableRelationsHelpers(artists);
    const { creator, updater } = artistsRelations.config(helpers);

    expect(creator.referencedTable).toBe(users);
    expect(updater.referencedTable).toBe(users);
  });
});
