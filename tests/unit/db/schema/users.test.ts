import {
  createTableRelationsHelpers,
  StringChunk,
  type SQL,
} from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import artists from "../../../../src/db/schema/artists.js";
import users, {
  USER_ROLE,
  usersRelations,
} from "../../../../src/db/schema/users.js";

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

describe("users", () => {
  it("should be stored under the table name users", () => {
    const { name } = getTableConfig(users);

    expect(name).toBe("users");
  });

  it("should have exactly the expected set of columns", () => {
    const { columns } = getTableConfig(users);
    const columnNames = columns.map((column) => column.name);

    expect(columnNames).toEqual([
      "id",
      "email",
      "email_verified",
      "name",
      "first_name",
      "last_name",
      "role",
      "bio",
      "created_at",
      "updated_at",
      "created_by",
      "updated_by",
    ]);
  });

  it("should have a unique, randomly generated identifier", () => {
    expect(users.id.primary).toBe(true);
    expect(users.id.columnType).toBe("PgUUID");
    expect(defaultSqlText(users.id.default)).toBe("uuidv7()");
  });

  it("should require a unique email address", () => {
    expect(users.email.notNull).toBe(true);
    expect(users.email.isUnique).toBe(true);
  });

  it("should treat a new user's email as unverified by default", () => {
    expect(users.emailVerified.notNull).toBe(true);
    expect(users.emailVerified.default).toBe(false);
  });

  it("should require a name", () => {
    expect(users.name.notNull).toBe(true);
    expect(users.name.isUnique).toBe(false);
  });

  it("should make a first name optional", () => {
    expect(users.firstName.notNull).toBe(false);
  });

  it("should make a last name optional", () => {
    expect(users.lastName.notNull).toBe(false);
  });

  it("should default to a regular role, while allowing other roles too", () => {
    expect(USER_ROLE).toEqual({
      USER: "user",
      ADMIN: "admin",
      MANAGER: "manager",
    });
    expect(users.role.notNull).toBe(true);
    expect(users.role.default).toBe(USER_ROLE.USER);
    expect(users.role.columnType).toBe("PgText");
  });

  it("should make a short biography optional", () => {
    expect(users.bio.notNull).toBe(false);
  });

  it("should record when it was created", () => {
    expect(users.createdAt.notNull).toBe(true);
    expect(users.createdAt.hasDefault).toBe(true);
  });

  it("should record when it was last updated", () => {
    expect(users.updatedAt.notNull).toBe(true);
    expect(users.updatedAt.hasDefault).toBe(true);
  });

  it("should optionally track who created it", () => {
    const { foreignKeys } = getTableConfig(users);
    const foreignKey = findForeignKeyFrom(foreignKeys, users.createdBy);

    expect(users.createdBy.notNull).toBe(false);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
  });

  it("should optionally track who last updated it", () => {
    const { foreignKeys } = getTableConfig(users);
    const foreignKey = findForeignKeyFrom(foreignKeys, users.updatedBy);

    expect(users.updatedBy.notNull).toBe(false);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
  });

  it("should be linked to the artists it created and last updated", () => {
    const helpers = createTableRelationsHelpers(users);
    const { createdArtists, updatedArtists } = usersRelations.config(helpers);

    expect(createdArtists.referencedTable).toBe(artists);
    expect(updatedArtists.referencedTable).toBe(artists);
  });

  it("should be linked back to who created and last updated it", () => {
    const helpers = createTableRelationsHelpers(users);
    const { creator, updater } = usersRelations.config(helpers);

    expect(creator.referencedTable).toBe(users);
    expect(updater.referencedTable).toBe(users);
  });
});
