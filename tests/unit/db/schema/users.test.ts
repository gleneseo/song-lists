import { createTableRelationsHelpers } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import artists from "../../../../src/db/schema/artists.ts";
import users, {
  USER_ROLE,
  usersRelations,
} from "../../../../src/db/schema/users.ts";

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
      "full_name",
      "display_name",
      "role",
      "notes",
      "created_at",
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

  it("makes full_name optional", () => {
    expect(users.fullName.notNull).toBe(false);
  });

  it("makes display_name optional but unique", () => {
    expect(users.displayName.notNull).toBe(false);
    expect(users.displayName.isUnique).toBe(true);
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

  it("makes notes optional", () => {
    expect(users.notes.notNull).toBe(false);
  });

  it("defaults created_at to now", () => {
    expect(users.createdAt.notNull).toBe(true);
    expect(users.createdAt.hasDefault).toBe(true);
  });

  it("relates each user to the artists they created", () => {
    const helpers = createTableRelationsHelpers(users);
    const { artists: relatedArtists } = usersRelations.config(helpers);

    expect(relatedArtists.referencedTable).toBe(artists);
  });
});
