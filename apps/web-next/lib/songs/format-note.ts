import { formatDateTime } from "@/lib/text/format-date";

/** Who wrote a note and when, as it's shown after the note: "Cliff · Aug 6, 2026, 8:42 AM PDT". */
function formatNoteByline(author: string, createdAt: Date): string {
  return `${author} · ${formatDateTime(createdAt)}`;
}

export { formatNoteByline };
