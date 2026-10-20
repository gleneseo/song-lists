import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  BANG_AS_I_PATTERN,
  DOLLAR_AS_S_PATTERN,
} from "@/lib/text/read-symbols";
import { LEADING_ARTICLE_PATTERN } from "@/lib/text/sort-key";

/**
 * The database's version of `readSymbols`: `column` with "$" and "!" used as
 * letters read as the "s" and "i" they stand for.
 */
function readSymbolsSql(column: AnyPgColumn | SQL): SQL<string> {
  return sql<string>`regexp_replace(regexp_replace(${column}, ${DOLLAR_AS_S_PATTERN}, 's', 'g'), ${BANG_AS_I_PATTERN}, 'i', 'g')`;
}

/**
 * The database's version of `sortKey`, for use in an ORDER BY: `column`
 * lowercased, with "$" and "!" used as letters read as "s" and "i" and a
 * leading "The", "A", "An", or "Tha" moved to the end.
 */
function sortKeySql(column: AnyPgColumn | SQL): SQL<string> {
  return sql<string>`lower(regexp_replace(${readSymbolsSql(column)}, ${LEADING_ARTICLE_PATTERN}, '\\2, \\1', 'i'))`;
}

export { readSymbolsSql, sortKeySql };
