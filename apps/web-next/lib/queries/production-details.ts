import { countDistinct, eq } from "drizzle-orm";
import { schema } from "@song-lists/db";
import {
  toProductionDetails,
  type ProductionDetails,
} from "@/lib/productions/production-details";
import { db } from "./client";

/** One production with its songs, or `null` when no production has that id. */
async function getProductionDetails(
  productionId: number,
): Promise<ProductionDetails | null> {
  const [row, lists] = await Promise.all([
    db.query.productions.findFirst({
      where: eq(schema.productions.id, productionId),
      columns: {
        id: true,
        name: true,
        releaseYear: true,
        typeId: true,
        createdAt: true,
      },
      with: {
        type: { columns: { name: true } },
        songs: {
          columns: { id: true },
          with: {
            song: {
              columns: { id: true, title: true },
              with: { artist: { columns: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    db
      .select({
        id: schema.lists.id,
        name: schema.lists.name,
        songCount: countDistinct(schema.listSongs.songId),
      })
      .from(schema.songProductions)
      .innerJoin(
        schema.listSongs,
        eq(schema.listSongs.songId, schema.songProductions.songId),
      )
      .innerJoin(schema.lists, eq(schema.lists.id, schema.listSongs.listId))
      .where(eq(schema.songProductions.productionId, productionId))
      .groupBy(schema.lists.id, schema.lists.name),
  ]);

  return row ? toProductionDetails(row, lists) : null;
}

export { getProductionDetails };
