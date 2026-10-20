import { formatDateTime } from "@/lib/text/format-date";
import { normalizeText } from "@/lib/text/normalize";

/**
 * A new note for a song's bio, signed with who wrote it and when -- "Great
 * live. — Cliff · Aug 6, 2026, 8:42 AM PDT" -- or `null` when the text is blank.
 */
function formatNote(text: string, author: string, now: Date): string | null {
  const body = normalizeText(text);

  return body ? `${body} — ${author} · ${formatDateTime(now)}` : null;
}

export { formatNote };
