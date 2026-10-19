"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ClampedText } from "@/components/clamped-text";

const noopSubscribe = () => () => {};

/**
 * A song's title as a link to its details -- a modal over the current page,
 * or the full song page when opened directly.
 *
 * Until the page has hydrated, a click would be a plain browser navigation,
 * which skips the modal's route interception and lands on the full page. So
 * the title is only a link once React is ready to handle the click.
 */
function SongTitleLink({ id, title }: { id: number; title: string }) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const className =
    "block rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";
  const text = <ClampedText text={title} className="font-medium" />;

  if (!hydrated) {
    return <span className={className}>{text}</span>;
  }

  return (
    <Link href={`/song/${id}`} className={className}>
      {text}
    </Link>
  );
}

export { SongTitleLink };
