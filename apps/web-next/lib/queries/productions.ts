import { asc, sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { readSymbols } from "@/lib/text/read-symbols";
import { db } from "./client";
import { readSymbolsSql } from "./sort-key";

interface ProductionOption {
  id: number;
  name: string;
  releaseYear: number;
  type: { id: number; name: string };
}

interface ProductionTypeOption {
  id: number;
  name: string;
}

/**
 * Finds existing productions whose name is a close (trigram) or substring
 * match for `query`, ordered by closeness.
 */
async function searchProductions(
  query: string,
  limit = 8,
): Promise<ProductionOption[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  // Compared with "$" and "!" read as letters, so "short" finds "$hort".
  const name = readSymbolsSql(schema.productions.name);
  const read = readSymbols(trimmed);

  return db.query.productions.findMany({
    columns: { id: true, name: true, releaseYear: true },
    with: { type: { columns: { id: true, name: true } } },
    where: sql`(${name} % ${read} OR ${name} ILIKE ${`%${read}%`})`,
    orderBy: [sql`similarity(${name}, ${read}) DESC`],
    limit,
  });
}

/**
 * Lists every production type -- there are only ever a handful of these
 * (Film, Television, Stage), and this app doesn't allow creating more.
 */
async function getProductionTypes(): Promise<ProductionTypeOption[]> {
  return db.query.productionTypes.findMany({
    columns: { id: true, name: true },
    orderBy: [asc(schema.productionTypes.name)],
  });
}

export { searchProductions, getProductionTypes };
export type { ProductionOption, ProductionTypeOption };
