/**
 * A dollar sign that isn't the start of an amount -- "Too $hort", "A$AP
 * Rocky", "Bada$$" -- stands in for an "s". One before a digit ("$20 Bill")
 * is money and stays.
 */
const DOLLAR_AS_S_PATTERN = "\\$(?!\\d)";

/**
 * An exclamation point inside a word -- "P!nk" -- stands in for an "i". One
 * that ends a word or sentence ("Yahoo!", "Hey! You", "!!!") is punctuation
 * and stays.
 */
const BANG_AS_I_PATTERN = "!(?=\\w)";

const dollarAsS = new RegExp(DOLLAR_AS_S_PATTERN, "g");
const bangAsI = new RegExp(BANG_AS_I_PATTERN, "g");

/**
 * `text` with "$" and "!" used as letters read as the "s" and "i" they stand
 * for, so "Too $hort" is "Too Short" and "P!nk" is "Pink". Sorting and
 * searching both go by this, not by what's shown. The database does the same
 * with `readSymbolsSql`; the two share the patterns above and must stay in
 * step.
 */
function readSymbols(text: string): string {
  return text.replace(dollarAsS, "s").replace(bangAsI, "i");
}

export { BANG_AS_I_PATTERN, DOLLAR_AS_S_PATTERN, readSymbols };
