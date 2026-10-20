import { readSymbols } from "./read-symbols";

/**
 * Leading words that don't count when alphabetizing a name or title, so "The
 * Stone Roses" files under S and "A Tribe Called Quest" under T.
 */
const LEADING_ARTICLES = ["the", "an", "a", "tha"] as const;

/**
 * The pattern, in both JavaScript's and Postgres's regex flavors, for a
 * leading article followed by the rest: group 1 is the article, group 2 the
 * rest. It needs both, so a lone "The" or a name like "A$AP Rocky" is left
 * whole. Case is ignored.
 */
const LEADING_ARTICLE_PATTERN = `^(${LEADING_ARTICLES.join("|")})\\s+(.+)$`;

const leadingArticle = new RegExp(LEADING_ARTICLE_PATTERN, "i");

/**
 * What to sort `text` by -- not what to show. "$" and "!" used as letters
 * count as those letters ("P!nk" sorts as "pink"), a leading article moves
 * to the end ("The Stone Roses" sorts as "stone roses, the"), and case is
 * ignored. The database sorts with an equivalent expression, `sortKeySql`;
 * the two share their patterns and must stay in step.
 */
function sortKey(text: string): string {
  return readSymbols(text).replace(leadingArticle, "$2, $1").toLowerCase();
}

/** Compares two texts by their sort keys, for `Array.prototype.sort`. */
function byText(a: string, b: string): number {
  return sortKey(a).localeCompare(sortKey(b));
}

export { byText, LEADING_ARTICLE_PATTERN, sortKey };
