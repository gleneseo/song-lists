/**
 * Our house style for names and titles: every word starts with a capital
 * letter -- even short ones like "The" and "A" -- and a word in ALL CAPS is
 * allowed, taken to be an acronym. An all-lowercase word breaks the style, and
 * so do odd capitals inside a word ("ScHoolboy") -- though those are often
 * deliberate, so what's suggested for them is only a best guess.
 */

type StyleCheck = { ok: true } | { ok: false; suggestion: string };

/** A word, with an apostrophe-joined tail ("Don't", "O'Brien") kept as part of it. */
const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

/**
 * Name prefixes that are conventionally followed by a capital -- "McCartney",
 * "DeBarge", "LaBelle" -- so a name built on one isn't odd capitals.
 */
const NAME_PREFIX = /^(Mc|Mac|De|La|Le|Di)\p{Lu}\p{Ll}*$/u;

/**
 * Words that are always written in lowercase, whatever their place in the
 * name -- "Kramer vs. Kramer". Fully capitalized text is left as it is.
 */
const ALWAYS_LOWERCASE = new Set(["vs"]);

/**
 * Words that may be written in lowercase, as in "School Anthem (aka
 * Senioritis)", but needn't be: "Aka" is as good.
 */
const MAY_BE_LOWERCASE = new Set(["aka"]);

/** The lowercase endings that follow an apostrophe, as in "Don't" and "M.D.'s". */
const CONTRACTION_ENDINGS = new Set(["s", "t", "d", "m", "ll", "re", "ve"]);

/** Whether `text` has no uppercase or lowercase to speak of, as in a number or Japanese. */
function isCaseless(text: string): boolean {
  return text.toLowerCase() === text.toUpperCase();
}

/**
 * Writes "$" and "!" used as letters as the letter they stand for -- the same
 * reading as sorting and searching -- in the case they appear to be in. One
 * starting a word is a capital ("Too $hort"), one between capitals is a
 * capital ("A$AP"), and any other is lowercase ("Ke$ha", "P!nk"). The result
 * is the same length as `text`, so positions in one are positions in the other.
 */
function readSymbolsForCase(text: string): string {
  return text.replace(/\$(?!\d)|!(?=\w)/g, (symbol, index: number) => {
    const before = text[index - 1] ?? "";
    const after = text[index + 1] ?? "";
    const startsWord = !/[\p{L}\p{N}$!'’]/u.test(before);
    const betweenCapitals =
      /\p{Lu}/u.test(before) &&
      (/\p{Lu}/u.test(after) || !/\p{L}/u.test(after));
    const letter = symbol === "$" ? "s" : "i";

    return startsWord || betweenCapitals ? letter.toUpperCase() : letter;
  });
}

/** How one piece of a word -- the part before an apostrophe, or after one -- fares. */
type PieceStatus = "ok" | "fixable" | "irregular";

function checkPiece(piece: string, joined: boolean): PieceStatus {
  // A leading digit ("10cc", "2Pac", "3rd") is stylized often enough to leave alone.
  if (/^\d/u.test(piece)) {
    return "ok";
  }

  const letters = piece.replace(/\d/gu, "");

  if (isCaseless(letters) || letters === letters.toUpperCase()) {
    return "ok";
  }

  if (/^\p{Lu}\p{Ll}*$/u.test(letters)) {
    return "ok";
  }

  if (!joined && NAME_PREFIX.test(letters)) {
    return "ok";
  }

  // An acronym made plural: "MCs", "DJs".
  if (!joined && /^\p{Lu}{2,}s$/u.test(letters)) {
    return "ok";
  }

  // After an apostrophe inside a word ("Don't"), lowercase is fine.
  if (joined && /^\p{Ll}+$/u.test(letters)) {
    return "ok";
  }

  return /^\p{Ll}+$/u.test(letters) ? "fixable" : "irregular";
}

/** `word` with a capital first letter and the rest lowercase. */
function capitalized(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Checks `text` against the house style. When it breaks, `suggestion` is the
 * same text with each off word put right: an all-lowercase or oddly
 * capitalized word becomes Capitalized ("mOnEy" is "Money"), and "vs" is
 * lowercased. Oddly capitalized words may well be deliberate, as in "ScHoolboy
 * Q", so the suggestion is only that -- the caller decides whether to let the
 * original through.
 */
function checkStyle(text: string): StyleCheck {
  const read = readSymbolsForCase(text);
  const allCaps = read === read.toUpperCase() && !isCaseless(read);
  const fixes: { index: number; length: number; to: string }[] = [];

  for (const match of read.matchAll(WORD)) {
    const [word] = match;
    const afterApostrophe = /['’]/u.test(read[match.index - 1] ?? "");
    let index = match.index;

    word.split(/['’]/u).forEach((piece, position) => {
      const joined = position > 0;
      const keepsLowercase =
        !joined && !allCaps && ALWAYS_LOWERCASE.has(piece.toLowerCase());
      const status = keepsLowercase
        ? piece === piece.toLowerCase()
          ? "ok"
          : "lowercase"
        : !joined && !allCaps && MAY_BE_LOWERCASE.has(piece)
          ? "ok"
          : afterApostrophe && !joined && CONTRACTION_ENDINGS.has(piece)
            ? "ok"
            : checkPiece(piece, joined);
      const original = text.slice(index, index + piece.length);

      if (status === "lowercase") {
        fixes.push({ index, length: piece.length, to: original.toLowerCase() });
      } else if (status !== "ok") {
        fixes.push({ index, length: piece.length, to: capitalized(original) });
      }

      // The apostrophe between pieces is one character.
      index += piece.length + 1;
    });
  }

  if (fixes.length === 0) {
    return { ok: true };
  }

  // Last to first, so a word that changes length can't shift the positions
  // still to come.
  const suggestion = fixes
    .toReversed()
    .reduce(
      (fixed, { index, length, to }) =>
        fixed.slice(0, index) + to + fixed.slice(index + length),
      text,
    );

  return { ok: false, suggestion };
}

export { checkStyle };
export type { StyleCheck };
