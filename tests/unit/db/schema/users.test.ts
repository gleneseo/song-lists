import { createTableRelationsHelpers } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import artists from "../../../../src/db/schema/artists.ts";
import users, {
  USER_ROLE,
  usersRelations,
} from "../../../../src/db/schema/users.ts";

function findForeignKeyFrom(
  foreignKeys: ReturnType<typeof getTableConfig>["foreignKeys"],
  column: unknown,
) {
  return foreignKeys.find(
    (foreignKey) => foreignKey.reference().columns[0] === column,
  );
}

describe("users", () => {
  it("is named users", () => {
    const { name } = getTableConfig(users);

    expect(name).toBe("users");
  });

  it("defines the expected columns", () => {
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
      "created_by",
      "updated_at",
      "updated_by",
    ]);
  });

  it("has a randomly-generated uuid primary key", () => {
    expect(users.id.primary).toBe(true);
    expect(users.id.columnType).toBe("PgUUID");
    expect(users.id.hasDefault).toBe(true);
  });

  it("requires a unique email", () => {
    expect(users.email.notNull).toBe(true);
    expect(users.email.isUnique).toBe(true);
  });

  it("defaults email_verified to false", () => {
    expect(users.emailVerified.notNull).toBe(true);
    expect(users.emailVerified.default).toBe(false);
  });

  it("requires a name", () => {
    expect(users.name.notNull).toBe(true);
    expect(users.name.isUnique).toBe(false);
  });

  it("makes first_name optional", () => {
    expect(users.firstName.notNull).toBe(false);
  });

  it("makes last_name optional", () => {
    expect(users.lastName.notNull).toBe(false);
  });

  it("defaults role to USER and enumerates all roles", () => {
    expect(USER_ROLE).toEqual({
      USER: "user",
      ADMIN: "admin",
      MANAGER: "manager",
    });
    expect(users.role.notNull).toBe(true);
    expect(users.role.default).toBe(USER_ROLE.USER);
    expect(users.role.enumValues).toEqual(Object.values(USER_ROLE));
  });

  it("makes bio optional", () => {
    expect(users.bio.notNull).toBe(false);
  });

  it("defaults created_at to now", () => {
    expect(users.createdAt.notNull).toBe(true);
    expect(users.createdAt.hasDefault).toBe(true);
  });

  it("defaults updated_at to now", () => {
    expect(users.updatedAt.notNull).toBe(true);
    expect(users.updatedAt.hasDefault).toBe(true);
  });

  it("allows created_by to reference the user that created this user", () => {
    const { foreignKeys } = getTableConfig(users);
    const foreignKey = findForeignKeyFrom(foreignKeys, users.createdBy);

    expect(users.createdBy.notNull).toBe(false);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
  });

  it("allows updated_by to reference the user that last updated this user", () => {
    const { foreignKeys } = getTableConfig(users);
    const foreignKey = findForeignKeyFrom(foreignKeys, users.updatedBy);

    expect(users.updatedBy.notNull).toBe(false);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
  });

  it("relates each user to the artists they created and last updated", () => {
    const helpers = createTableRelationsHelpers(users);
    const { createdArtists, updatedArtists } = usersRelations.config(helpers);

    expect(createdArtists.referencedTable).toBe(artists);
    expect(updatedArtists.referencedTable).toBe(artists);
  });

  it("relates each user to who created and last updated it", () => {
    const helpers = createTableRelationsHelpers(users);
    const { creator, updater } = usersRelations.config(helpers);

    expect(creator.referencedTable).toBe(users);
    expect(updater.referencedTable).toBe(users);
  });
});
