import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  normalizeRelation,
} from "drizzle-orm";
import { getTableConfig, pgTable, serial } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "../../../src/schema/song-lists.js";
import {
  accounts,
  actorColumns,
  artists,
  lists,
  listSongs,
  productionTypes,
  productions,
  sessions,
  songAdvocates,
  songCovers,
  songFeaturedArtists,
  songProductions,
  songs,
  users,
} from "../../../src/schema/song-lists.js";

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

  it("should distinguish the songs it created from the songs it last updated", () => {
    expect(resolveRelation("users", "createdSongs")).toEqual({
      fields: [users.id],
      references: [songs.createdBy],
    });
    expect(resolveRelation("users", "updatedSongs")).toEqual({
      fields: [users.id],
      references: [songs.updatedBy],
    });
  });

  it("should distinguish the featured-artist credits it created from the ones it last updated", () => {
    expect(resolveRelation("users", "createdSongFeaturedArtists")).toEqual({
      fields: [users.id],
      references: [songFeaturedArtists.createdBy],
    });
    expect(resolveRelation("users", "updatedSongFeaturedArtists")).toEqual({
      fields: [users.id],
      references: [songFeaturedArtists.updatedBy],
    });
  });

  it("should distinguish the song-production credits it created from the ones it last updated", () => {
    expect(resolveRelation("users", "createdSongProductions")).toEqual({
      fields: [users.id],
      references: [songProductions.createdBy],
    });
    expect(resolveRelation("users", "updatedSongProductions")).toEqual({
      fields: [users.id],
      references: [songProductions.updatedBy],
    });
  });

  it("should list the songs it has advocated for", () => {
    expect(resolveRelation("users", "advocatedSongs")).toEqual({
      fields: [users.id],
      references: [songAdvocates.userId],
    });
  });

  it("should distinguish the advocate credits it created from the ones it last updated", () => {
    expect(resolveRelation("users", "createdSongAdvocates")).toEqual({
      fields: [users.id],
      references: [songAdvocates.createdBy],
    });
    expect(resolveRelation("users", "updatedSongAdvocates")).toEqual({
      fields: [users.id],
      references: [songAdvocates.updatedBy],
    });
  });

  it("should distinguish the lists it created from the lists it last updated", () => {
    expect(resolveRelation("users", "createdLists")).toEqual({
      fields: [users.id],
      references: [lists.createdBy],
    });
    expect(resolveRelation("users", "updatedLists")).toEqual({
      fields: [users.id],
      references: [lists.updatedBy],
    });
  });

  it("should distinguish the list-song entries it created from the ones it last updated", () => {
    expect(resolveRelation("users", "createdListSongs")).toEqual({
      fields: [users.id],
      references: [listSongs.createdBy],
    });
    expect(resolveRelation("users", "updatedListSongs")).toEqual({
      fields: [users.id],
      references: [listSongs.updatedBy],
    });
  });

  it("should distinguish the production types it created from the production types it last updated", () => {
    expect(resolveRelation("users", "createdProductionTypes")).toEqual({
      fields: [users.id],
      references: [productionTypes.createdBy],
    });
    expect(resolveRelation("users", "updatedProductionTypes")).toEqual({
      fields: [users.id],
      references: [productionTypes.updatedBy],
    });
  });

  it("should distinguish the productions it created from the productions it last updated", () => {
    expect(resolveRelation("users", "createdProductions")).toEqual({
      fields: [users.id],
      references: [productions.createdBy],
    });
    expect(resolveRelation("users", "updatedProductions")).toEqual({
      fields: [users.id],
      references: [productions.updatedBy],
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
  it("should list the songs it performs", () => {
    expect(resolveRelation("artists", "songs")).toEqual({
      fields: [artists.id],
      references: [songs.artistId],
    });
  });

  it("should list the songs it is featured on", () => {
    expect(resolveRelation("artists", "featuredOnSongs")).toEqual({
      fields: [artists.id],
      references: [songFeaturedArtists.artistId],
    });
  });

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

describe("songs", () => {
  it("should resolve back to the artist it belongs to", () => {
    expect(resolveRelation("songs", "artist")).toEqual({
      fields: [songs.artistId],
      references: [artists.id],
    });
  });

  it("should list the songs it covers, and the songs that cover it", () => {
    expect(resolveRelation("songs", "coverOf")).toEqual({
      fields: [songs.id],
      references: [songCovers.songId],
    });
    expect(resolveRelation("songs", "coveredBy")).toEqual({
      fields: [songs.id],
      references: [songCovers.originalSongId],
    });
  });

  it("should list the artists featured on it", () => {
    expect(resolveRelation("songs", "featuredArtists")).toEqual({
      fields: [songs.id],
      references: [songFeaturedArtists.songId],
    });
  });

  it("should list the productions it appears in", () => {
    expect(resolveRelation("songs", "productions")).toEqual({
      fields: [songs.id],
      references: [songProductions.songId],
    });
  });

  it("should list the users who have advocated for it", () => {
    expect(resolveRelation("songs", "advocates")).toEqual({
      fields: [songs.id],
      references: [songAdvocates.songId],
    });
  });

  it("should list the lists it appears on", () => {
    expect(resolveRelation("songs", "lists")).toEqual({
      fields: [songs.id],
      references: [listSongs.songId],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("songs", "creator")).toEqual({
      fields: [songs.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("songs", "updater")).toEqual({
      fields: [songs.updatedBy],
      references: [users.id],
    });
  });
});

describe("lists", () => {
  it("should list the songs on it", () => {
    expect(resolveRelation("lists", "songs")).toEqual({
      fields: [lists.id],
      references: [listSongs.listId],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("lists", "creator")).toEqual({
      fields: [lists.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("lists", "updater")).toEqual({
      fields: [lists.updatedBy],
      references: [users.id],
    });
  });
});

describe("listSongs", () => {
  it("should resolve back to the list and the song on it", () => {
    expect(resolveRelation("listSongs", "list")).toEqual({
      fields: [listSongs.listId],
      references: [lists.id],
    });
    expect(resolveRelation("listSongs", "song")).toEqual({
      fields: [listSongs.songId],
      references: [songs.id],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("listSongs", "creator")).toEqual({
      fields: [listSongs.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("listSongs", "updater")).toEqual({
      fields: [listSongs.updatedBy],
      references: [users.id],
    });
  });
});

describe("songAdvocates", () => {
  it("should resolve back to the song and the user advocating for it", () => {
    expect(resolveRelation("songAdvocates", "song")).toEqual({
      fields: [songAdvocates.songId],
      references: [songs.id],
    });
    expect(resolveRelation("songAdvocates", "advocate")).toEqual({
      fields: [songAdvocates.userId],
      references: [users.id],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("songAdvocates", "creator")).toEqual({
      fields: [songAdvocates.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("songAdvocates", "updater")).toEqual({
      fields: [songAdvocates.updatedBy],
      references: [users.id],
    });
  });
});

describe("songFeaturedArtists", () => {
  it("should resolve back to the song and the artist featured on it", () => {
    expect(resolveRelation("songFeaturedArtists", "song")).toEqual({
      fields: [songFeaturedArtists.songId],
      references: [songs.id],
    });
    expect(resolveRelation("songFeaturedArtists", "artist")).toEqual({
      fields: [songFeaturedArtists.artistId],
      references: [artists.id],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("songFeaturedArtists", "creator")).toEqual({
      fields: [songFeaturedArtists.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("songFeaturedArtists", "updater")).toEqual({
      fields: [songFeaturedArtists.updatedBy],
      references: [users.id],
    });
  });
});

describe("songCovers", () => {
  it("should resolve back to the covering song and the original it covers", () => {
    expect(resolveRelation("songCovers", "song")).toEqual({
      fields: [songCovers.songId],
      references: [songs.id],
    });
    expect(resolveRelation("songCovers", "original")).toEqual({
      fields: [songCovers.originalSongId],
      references: [songs.id],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("songCovers", "creator")).toEqual({
      fields: [songCovers.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("songCovers", "updater")).toEqual({
      fields: [songCovers.updatedBy],
      references: [users.id],
    });
  });
});

describe("productionTypes", () => {
  it("should list the productions that carry it", () => {
    expect(resolveRelation("productionTypes", "productions")).toEqual({
      fields: [productionTypes.id],
      references: [productions.typeId],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("productionTypes", "creator")).toEqual({
      fields: [productionTypes.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("productionTypes", "updater")).toEqual({
      fields: [productionTypes.updatedBy],
      references: [users.id],
    });
  });
});

describe("productions", () => {
  it("should resolve back to its production type", () => {
    expect(resolveRelation("productions", "type")).toEqual({
      fields: [productions.typeId],
      references: [productionTypes.id],
    });
  });

  it("should list the songs it uses", () => {
    expect(resolveRelation("productions", "songs")).toEqual({
      fields: [productions.id],
      references: [songProductions.productionId],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("productions", "creator")).toEqual({
      fields: [productions.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("productions", "updater")).toEqual({
      fields: [productions.updatedBy],
      references: [users.id],
    });
  });
});

describe("songProductions", () => {
  it("should resolve back to the song and the production it appears in", () => {
    expect(resolveRelation("songProductions", "song")).toEqual({
      fields: [songProductions.songId],
      references: [songs.id],
    });
    expect(resolveRelation("songProductions", "production")).toEqual({
      fields: [songProductions.productionId],
      references: [productions.id],
    });
  });

  it("should distinguish who created it from who last updated it", () => {
    expect(resolveRelation("songProductions", "creator")).toEqual({
      fields: [songProductions.createdBy],
      references: [users.id],
    });
    expect(resolveRelation("songProductions", "updater")).toEqual({
      fields: [songProductions.updatedBy],
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

  /**
   * Better Auth 1.7 keys account identity by (issuer, accountId) rather than
   * (providerId, accountId); without this constraint the Drizzle adapter
   * cannot enforce that a sign-up is unique per issuer
   */
  it("should require a unique combination of issuer and account id", () => {
    const { uniqueConstraints } = getTableConfig(accounts);
    const constraint = uniqueConstraints.find(
      (candidate) => candidate.name === "accounts_issuer_account_id_unique",
    );

    expect(constraint?.columns.map((column) => column.name)).toEqual([
      "issuer",
      "accountId",
    ]);
  });
});

describe("foreign key wiring", () => {
  it("should point every tracked-by and user-owned column at the real user id column", () => {
    const referencesUserId = [
      { table: users, column: users.createdBy },
      { table: users, column: users.updatedBy },
      { table: artists, column: artists.createdBy },
      { table: artists, column: artists.updatedBy },
      { table: songs, column: songs.createdBy },
      { table: songs, column: songs.updatedBy },
      { table: songFeaturedArtists, column: songFeaturedArtists.createdBy },
      { table: songFeaturedArtists, column: songFeaturedArtists.updatedBy },
      { table: songCovers, column: songCovers.createdBy },
      { table: songCovers, column: songCovers.updatedBy },
      { table: songProductions, column: songProductions.createdBy },
      { table: songProductions, column: songProductions.updatedBy },
      { table: songAdvocates, column: songAdvocates.userId },
      { table: songAdvocates, column: songAdvocates.createdBy },
      { table: songAdvocates, column: songAdvocates.updatedBy },
      { table: lists, column: lists.createdBy },
      { table: lists, column: lists.updatedBy },
      { table: listSongs, column: listSongs.createdBy },
      { table: listSongs, column: listSongs.updatedBy },
      { table: productionTypes, column: productionTypes.createdBy },
      { table: productionTypes, column: productionTypes.updatedBy },
      { table: productions, column: productions.createdBy },
      { table: productions, column: productions.updatedBy },
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

  it("should point a song's artist at the real artist id column", () => {
    const { foreignKeys } = getTableConfig(songs);
    const foreignKey = foreignKeys.find(
      (candidate) => candidate.reference().columns[0] === songs.artistId,
    );

    expect(foreignKey?.reference().foreignTable).toBe(artists);
    expect(foreignKey?.reference().foreignColumns).toEqual([artists.id]);
  });

  it("should point a song cover's song and original at the real song id column", () => {
    const { foreignKeys } = getTableConfig(songCovers);
    const songForeignKey = foreignKeys.find(
      (candidate) => candidate.reference().columns[0] === songCovers.songId,
    );
    const originalForeignKey = foreignKeys.find(
      (candidate) =>
        candidate.reference().columns[0] === songCovers.originalSongId,
    );

    expect(songForeignKey?.reference().foreignTable).toBe(songs);
    expect(songForeignKey?.reference().foreignColumns).toEqual([songs.id]);
    expect(originalForeignKey?.reference().foreignTable).toBe(songs);
    expect(originalForeignKey?.reference().foreignColumns).toEqual([songs.id]);
  });

  it("should point a featured-artist credit's song and artist at their real id columns", () => {
    const { foreignKeys } = getTableConfig(songFeaturedArtists);
    const songForeignKey = foreignKeys.find(
      (candidate) =>
        candidate.reference().columns[0] === songFeaturedArtists.songId,
    );
    const artistForeignKey = foreignKeys.find(
      (candidate) =>
        candidate.reference().columns[0] === songFeaturedArtists.artistId,
    );

    expect(songForeignKey?.reference().foreignTable).toBe(songs);
    expect(songForeignKey?.reference().foreignColumns).toEqual([songs.id]);
    expect(artistForeignKey?.reference().foreignTable).toBe(artists);
    expect(artistForeignKey?.reference().foreignColumns).toEqual([artists.id]);
  });

  it("should point a song-production credit's song and production at their real id columns", () => {
    const { foreignKeys } = getTableConfig(songProductions);
    const songForeignKey = foreignKeys.find(
      (candidate) =>
        candidate.reference().columns[0] === songProductions.songId,
    );
    const productionForeignKey = foreignKeys.find(
      (candidate) =>
        candidate.reference().columns[0] === songProductions.productionId,
    );

    expect(songForeignKey?.reference().foreignTable).toBe(songs);
    expect(songForeignKey?.reference().foreignColumns).toEqual([songs.id]);
    expect(productionForeignKey?.reference().foreignTable).toBe(productions);
    expect(productionForeignKey?.reference().foreignColumns).toEqual([
      productions.id,
    ]);
  });

  it("should point a song advocate's song at the real song id column", () => {
    const { foreignKeys } = getTableConfig(songAdvocates);
    const foreignKey = foreignKeys.find(
      (candidate) => candidate.reference().columns[0] === songAdvocates.songId,
    );

    expect(foreignKey?.reference().foreignTable).toBe(songs);
    expect(foreignKey?.reference().foreignColumns).toEqual([songs.id]);
  });

  it("should point a list-song entry's list and song at their real id columns", () => {
    const { foreignKeys } = getTableConfig(listSongs);
    const listForeignKey = foreignKeys.find(
      (candidate) => candidate.reference().columns[0] === listSongs.listId,
    );
    const songForeignKey = foreignKeys.find(
      (candidate) => candidate.reference().columns[0] === listSongs.songId,
    );

    expect(listForeignKey?.reference().foreignTable).toBe(lists);
    expect(listForeignKey?.reference().foreignColumns).toEqual([lists.id]);
    expect(songForeignKey?.reference().foreignTable).toBe(songs);
    expect(songForeignKey?.reference().foreignColumns).toEqual([songs.id]);
  });

  it("should point a production's type at the real production type id column", () => {
    const { foreignKeys } = getTableConfig(productions);
    const foreignKey = foreignKeys.find(
      (candidate) => candidate.reference().columns[0] === productions.typeId,
    );

    expect(foreignKey?.reference().foreignTable).toBe(productionTypes);
    expect(foreignKey?.reference().foreignColumns).toEqual([
      productionTypes.id,
    ]);
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
