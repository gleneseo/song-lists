/** A piece of text: plain words, or a web address to link to. */
type TextPart = { kind: "text"; text: string } | { kind: "link"; url: string };

const WEB_ADDRESS = /https?:\/\/[^\s<>"]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?'’”]+$/;

/** How far a web address runs: sentence punctuation, and a bracket nothing opened, are not part of it. */
function trimAddress(address: string): string {
  let url = address;

  for (;;) {
    const trimmed = url.replace(TRAILING_PUNCTUATION, "");
    const unopened =
      trimmed.endsWith(")") &&
      trimmed.split(")").length > trimmed.split("(").length;

    url = unopened ? trimmed.slice(0, -1) : trimmed;

    if (url === trimmed && !unopened) {
      return url;
    }
  }
}

/**
 * Splits text into plain stretches and the web addresses (http:// or
 * https://) among them, so the addresses can be shown as links.
 */
function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let from = 0;

  for (const match of text.matchAll(WEB_ADDRESS)) {
    const url = trimAddress(match[0]);

    if (url === "http://" || url === "https://") {
      continue;
    }

    if (match.index > from) {
      parts.push({ kind: "text", text: text.slice(from, match.index) });
    }

    parts.push({ kind: "link", url });
    from = match.index + url.length;
  }

  if (from < text.length) {
    parts.push({ kind: "text", text: text.slice(from) });
  }

  return parts;
}

export { splitLinks };
export type { TextPart };
