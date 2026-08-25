import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  normalizeRelation,
} from "drizzle-orm";
import { getTableConfig, pgTable, serial } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "../../../../src/db/schema/song-lists.js";
import {
  accounts,
  actorColumns,
  artists,
  sessions,
  users,
} from "../../../../src/db/schema/song-lists.js";

/**
 * Mirrors exactly what `drizzle(pool, { schema })` does with this schema
 * module at startup (see src/db/client.ts), and what it does again, lazily,
 * for each relation named in a `with: { ... }` query clause. Resolving a
 * relation here proves Drizzle can actually build the join for it -
 * including picking the right foreign key when a table has more than one
 * reference to the same related table - without needing a live database.
 */
const { tables, tableNamesMap } = extractTablesRelationalConfig(
  schema,
  createTableRelationsHelpers,
);

function resolveRelation(tableName: string, relationName: string) {
  const relation = tables[tableName]?.relations[relationName];

  if (!relation) {
    throw new Error(`no relation "${relationName}" on table "${tableName}"`);
  }

  return normalizeRelation(tables, tableNamesMap, relation);
}

describe("users", () => {
  it("should list the sessions and accounts belonging to it", () => {
    expect(resolveRelation("users", "sessions")).toEqual({
      fields: [users.id],
      references: [sessions.userId],
    });
    expect(resolveRelation("users", "accounts")).toEqual({
      fields: [users.id],
      references: [accounts.userId],
    });
  });

  it("should distinguish the artists it created from the artists it last updated", () => {
    expect(resolveRelation("users", "createdArtists")).toEqual({
      fields: [users.id],
      references: [artists.createdBy],
    });
    expect(resolveRelation("users", "updatedArtists")).toEqual({
      fields: [users.id],
      references: [artists.updatedBy],
    });
  });

  it("should be traceable back to who created it and who last updated it", () => {
    expect(resolveRelation("users", "creator")).toEqual({
      fields: [users.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("users", "updater")).toEqual({
      fields: [users.updatedBy],
      references: [users.id],
    });
  });
});

describe("artists", () => {
  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("artists", "creator")).toEqual({
      fields: [artists.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("artists", "updater")).toEqual({
      fields: [artists.updatedBy],
      references: [users.id],
    });
  });
});

describe("sessions", () => {
  it("should resolve back to the user it belongs to", () => {
    expect(resolveRelation("sessions", "user")).toEqual({
      fields: [sessions.userId],
      references: [users.id],
    });
  });
});

describe("accounts", () => {
  it("should resolve back to the user it belongs to", () => {
    expect(resolveRelation("accounts", "user")).toEqual({
      fields: [accounts.userId],
      references: [users.id],
    });
  });
});

describe("foreign key wiring", () => {
  it("should point every tracked-by and user-owned column at the real user id column", () => {
    const referencesUserId = [
      { table: users, column: users.createdBy },
      { table: users, column: users.updatedBy },
      { table: artists, column: artists.createdBy },
      { table: artists, column: artists.updatedBy },
      { table: sessions, column: sessions.userId },
      { table: accounts, column: accounts.userId },
    ];

    for (const { table, column } of referencesUserId) {
      const { foreignKeys } = getTableConfig(table);
      const foreignKey = foreignKeys.find(
        (candidate) => candidate.reference().columns[0] === column,
      );

      expect(foreignKey?.reference().foreignTable).toBe(users);
      expect(foreignKey?.reference().foreignColumns).toEqual([users.id]);
    }
  });
});

describe("actorColumns", () => {
  it("should give every table its own tracking columns, rather than sharing the same ones across tables", () => {
    const first = pgTable("actor_columns_first_fixture", {
      id: serial().primaryKey(),
      ...actorColumns(),
    });
    const second = pgTable("actor_columns_second_fixture", {
      id: serial().primaryKey(),
      ...actorColumns(),
    });

    expect(first.createdBy).not.toBe(second.createdBy);
    expect(first.updatedBy).not.toBe(second.updatedBy);
    expect(getTableConfig(first).foreignKeys[0]?.reference().foreignTable).toBe(
      users,
    );
    expect(
      getTableConfig(second).foreignKeys[0]?.reference().foreignTable,
    ).toBe(users);
  });
});
