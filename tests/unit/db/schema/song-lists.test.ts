import {
  createTableRelationsHelpers,
  StringChunk,
  type SQL,
} from "drizzle-orm";
import { getTableConfig, pgTable, serial } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  accounts,
  accountsRelations,
  actorColumns,
  artists,
  artistsRelations,
  auditColumns,
  sessions,
  sessionsRelations,
  timestampColumns,
  USER_ROLE,
  users,
  usersRelations,
  uuidV7,
  verifications,
} from "../../../../src/db/schema/song-lists.js";

function findForeignKeyFrom(
  foreignKeys: ReturnType<typeof getTableConfig>["foreignKeys"],
  column: unknown,
) {
  return foreignKeys.find(
    (foreignKey) => foreignKey.reference().columns[0] === column,
  );
}

function hasIndexOn(
  indexes: ReturnType<typeof getTableConfig>["indexes"],
  columnName: string,
) {
  return indexes.some((index) =>
    index.config.columns.some(
      (column) => "name" in column && column.name === columnName,
    ),
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
      "emailVerified",
      "name",
      "firstName",
      "lastName",
      "role",
      "bio",
      "image",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
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

  it("should make a profile image optional", () => {
    expect(users.image.notNull).toBe(false);
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

  it("should be linked to its sessions and accounts", () => {
    const helpers = createTableRelationsHelpers(users);
    const { sessions: sessionsRelation, accounts: accountsRelation } =
      usersRelations.config(helpers);

    expect(sessionsRelation.referencedTable).toBe(sessions);
    expect(accountsRelation.referencedTable).toBe(accounts);
  });

  it("should be linked back to who created and last updated it", () => {
    const helpers = createTableRelationsHelpers(users);
    const { creator, updater } = usersRelations.config(helpers);

    expect(creator.referencedTable).toBe(users);
    expect(updater.referencedTable).toBe(users);
  });
});

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
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
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

describe("sessions", () => {
  it("should be stored under the table name sessions", () => {
    const { name } = getTableConfig(sessions);

    expect(name).toBe("sessions");
  });

  it("should have exactly the expected set of columns", () => {
    const { columns } = getTableConfig(sessions);
    const columnNames = columns.map((column) => column.name);

    expect(columnNames).toEqual([
      "id",
      "token",
      "expiresAt",
      "ipAddress",
      "userAgent",
      "createdAt",
      "updatedAt",
      "userId",
    ]);
  });

  it("should have a unique, randomly generated identifier", () => {
    expect(sessions.id.primary).toBe(true);
    expect(sessions.id.columnType).toBe("PgUUID");
  });

  it("should require a unique session token", () => {
    expect(sessions.token.notNull).toBe(true);
    expect(sessions.token.isUnique).toBe(true);
  });

  it("should require an expiration time", () => {
    expect(sessions.expiresAt.notNull).toBe(true);
  });

  it("should make the requesting ip address and user agent optional", () => {
    expect(sessions.ipAddress.notNull).toBe(false);
    expect(sessions.userAgent.notNull).toBe(false);
  });

  it("should belong to a user, and be removed if that user is removed", () => {
    const { foreignKeys, indexes } = getTableConfig(sessions);
    const foreignKey = findForeignKeyFrom(foreignKeys, sessions.userId);

    expect(sessions.userId.notNull).toBe(true);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
    expect(foreignKey?.onDelete).toBe("cascade");
    expect(hasIndexOn(indexes, "userId")).toBe(true);
  });

  it("should be linked back to the user it belongs to", () => {
    const helpers = createTableRelationsHelpers(sessions);
    const { user } = sessionsRelations.config(helpers);

    expect(user.referencedTable).toBe(users);
  });
});

describe("accounts", () => {
  it("should be stored under the table name accounts", () => {
    const { name } = getTableConfig(accounts);

    expect(name).toBe("accounts");
  });

  it("should have exactly the expected set of columns", () => {
    const { columns } = getTableConfig(accounts);
    const columnNames = columns.map((column) => column.name);

    expect(columnNames).toEqual([
      "id",
      "accountId",
      "providerId",
      "accessToken",
      "refreshToken",
      "idToken",
      "accessTokenExpiresAt",
      "refreshTokenExpiresAt",
      "scope",
      "password",
      "createdAt",
      "updatedAt",
      "userId",
    ]);
  });

  it("should require the provider's account and provider identifiers", () => {
    expect(accounts.accountId.notNull).toBe(true);
    expect(accounts.providerId.notNull).toBe(true);
  });

  it("should make provider credentials optional, since they depend on the provider", () => {
    expect(accounts.accessToken.notNull).toBe(false);
    expect(accounts.refreshToken.notNull).toBe(false);
    expect(accounts.idToken.notNull).toBe(false);
    expect(accounts.accessTokenExpiresAt.notNull).toBe(false);
    expect(accounts.refreshTokenExpiresAt.notNull).toBe(false);
    expect(accounts.scope.notNull).toBe(false);
    expect(accounts.password.notNull).toBe(false);
  });

  it("should belong to a user, and be removed if that user is removed", () => {
    const { foreignKeys, indexes } = getTableConfig(accounts);
    const foreignKey = findForeignKeyFrom(foreignKeys, accounts.userId);

    expect(accounts.userId.notNull).toBe(true);
    expect(foreignKey?.reference().foreignTable).toBe(users);
    expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
    expect(foreignKey?.onDelete).toBe("cascade");
    expect(hasIndexOn(indexes, "userId")).toBe(true);
  });

  it("should be linked back to the user it belongs to", () => {
    const helpers = createTableRelationsHelpers(accounts);
    const { user } = accountsRelations.config(helpers);

    expect(user.referencedTable).toBe(users);
  });
});

describe("verifications", () => {
  it("should be stored under the table name verifications", () => {
    const { name } = getTableConfig(verifications);

    expect(name).toBe("verifications");
  });

  it("should have exactly the expected set of columns", () => {
    const { columns } = getTableConfig(verifications);
    const columnNames = columns.map((column) => column.name);

    expect(columnNames).toEqual([
      "id",
      "identifier",
      "value",
      "expiresAt",
      "createdAt",
      "updatedAt",
    ]);
  });

  it("should require an identifier, value, and expiration, and index the identifier for lookups", () => {
    const { indexes } = getTableConfig(verifications);

    expect(verifications.identifier.notNull).toBe(true);
    expect(verifications.value.notNull).toBe(true);
    expect(verifications.expiresAt.notNull).toBe(true);
    expect(hasIndexOn(indexes, "identifier")).toBe(true);
  });
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
      id: uuidV7().primaryKey(),
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
      ...actorColumns(),
    });

    it("should require tracking who created it and who last updated it", () => {
      const { foreignKeys } = getTableConfig(source);

      expect(source.createdBy.notNull).toBe(true);
      expect(source.updatedBy.notNull).toBe(true);
      expect(foreignKeys).toHaveLength(2);

      for (const foreignKey of foreignKeys) {
        const reference = foreignKey.reference();

        expect(reference.foreignTable).toBe(users);
        expect(reference.foreignColumns).toEqual([users.id]);
      }
    });
  });

  describe("the shared audit information on a record", () => {
    const source = pgTable("audit_columns_fixture", {
      id: serial("id").primaryKey(),
      ...auditColumns(),
    });

    it("should track both when it changed and who changed it", () => {
      const { columns, foreignKeys } = getTableConfig(source);
      const columnNames = columns.map((column) => column.name);

      expect(columnNames).toEqual([
        "id",
        "createdAt",
        "updatedAt",
        "createdBy",
        "updatedBy",
      ]);
      expect(foreignKeys).toHaveLength(2);
    });
  });
});
