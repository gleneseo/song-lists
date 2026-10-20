import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";
import { schema } from "@song-lists/db";
import { normalizeText } from "@/lib/text/normalize";

type Transaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

type ArtistSelection =
  { kind: "existing"; id: number } | { kind: "new"; name: string };

type ProductionSelection =
  | { kind: "existing"; id: number }
  | { kind: "new"; name: string; releaseYear: number; typeId: number }
  | null;

type CoverSelection =
  | { kind: "existing"; songId: number }
  | { kind: "new"; title: string; artist: ArtistSelection }
  | null;

/**
 * Resolves an artist selection to an ID, inserting a new artist row when the
 * user chose to create one. New artists are cached by normalized name within
 * a single submission, so e.g. picking "create new" for the same typed name
 * in both the main Artist field and a Featured Artist chip only inserts one
 * row.
 */
async function resolveArtist(
  tx: Transaction,
  selection: ArtistSelection,
  userId: string,
  newArtistsByName: Map<string, number>,
): Promise<number> {
  if (selection.kind === "existing") {
    return selection.id;
  }

  const name = normalizeText(selection.name);

  if (!name) {
    throw new Error("Artist name is required.");
  }

  const cacheKey = name.toLowerCase();
  const cached = newArtistsByName.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const [artist] = await tx
    .insert(schema.artists)
    .values({ name, createdBy: userId, updatedBy: userId })
    .returning({ id: schema.artists.id });

  if (!artist) {
    throw new Error("Expected the artist insert to return a row.");
  }

  newArtistsByName.set(cacheKey, artist.id);
  return artist.id;
}

/** Resolves a production selection to an ID, inserting a new production when asked to. */
async function resolveProduction(
  tx: Transaction,
  selection: ProductionSelection,
  userId: string,
): Promise<number | null> {
  if (!selection) {
    return null;
  }

  if (selection.kind === "existing") {
    return selection.id;
  }

  const name = normalizeText(selection.name);

  if (!name) {
    throw new Error("Production name is required.");
  }

  const [production] = await tx
    .insert(schema.productions)
    .values({
      name,
      releaseYear: selection.releaseYear,
      typeId: selection.typeId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning({ id: schema.productions.id });

  if (!production) {
    throw new Error("Expected the production insert to return a row.");
  }

  return production.id;
}

/**
 * Resolves a "cover of" selection to the ID of the original song, inserting
 * a new original song (and its artist) when asked to.
 */
async function resolveCover(
  tx: Transaction,
  selection: CoverSelection,
  userId: string,
  newArtistsByName: Map<string, number>,
): Promise<number | null> {
  if (!selection) {
    return null;
  }

  if (selection.kind === "existing") {
    return selection.songId;
  }

  const title = normalizeText(selection.title);

  if (!title) {
    throw new Error("Cover title is required.");
  }

  const coverArtistId = await resolveArtist(
    tx,
    selection.artist,
    userId,
    newArtistsByName,
  );

  const [originalSong] = await tx
    .insert(schema.songs)
    .values({
      title,
      artistId: coverArtistId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning({ id: schema.songs.id });

  if (!originalSong) {
    throw new Error("Expected the song insert to return a row.");
  }

  return originalSong.id;
}

export { resolveArtist, resolveCover, resolveProduction };
export type {
  ArtistSelection,
  CoverSelection,
  ProductionSelection,
  Transaction,
};
