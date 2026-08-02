import { createTableRelationsHelpers } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import artists, {
  artistsRelations,
} from "../../../../src/db/schema/artists.ts";
import users from "../../../../src/db/schema/users.ts";

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

    expect(artists.createdBy.notNull).toBe(true);
    expect(foreignKeys).toHaveLength(1);

    const reference = foreignKeys[0]?.reference();

    expect(reference?.foreignTable).toBe(users);
    expect(reference?.foreignColumns).toEqual([users.id]);
  });

  it("relates each artist to its creator", () => {
    const helpers = createTableRelationsHelpers(artists);
    const { creator } = artistsRelations.config(helpers);

    expect(creator.referencedTable).toBe(users);
  });
});
