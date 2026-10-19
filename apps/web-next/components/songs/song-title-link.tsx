import Link from "next/link";
import { ClampedText } from "@/components/clamped-text";

/**
 * A song's title as a link to its details -- a modal over the current page,
 * or the full song page when opened directly.
 */
function SongTitleLink({ id, title }: { id: number; title: string }) {
  return (
    <Link
      href={`/song/${id}`}
      className="block rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ClampedText text={title} className="font-medium" />
    </Link>
  );
}

export { SongTitleLink };
