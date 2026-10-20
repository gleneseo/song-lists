"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ClampedText } from "@/components/clamped-text";

const noopSubscribe = () => () => {};

const linkClassName =
  "block rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * A name as a link to its details -- a modal over the current page, or the
 * full page when opened directly. Used for songs, artists, and productions.
 *
 * Until the page has hydrated, a click would be a plain browser navigation,
 * which skips the modal's route interception and lands on the full page. So
 * the text is only a link once React is ready to handle the click.
 */
function DetailsLink({
  href,
  text,
  lines,
  className,
}: {
  href: string;
  text: string;
  lines?: 1 | 2;
  className?: string;
}) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const clamped = (
    <ClampedText text={text} lines={lines} className={className} />
  );

  if (!hydrated) {
    return <span className={linkClassName}>{clamped}</span>;
  }

  return (
    <Link href={href} className={linkClassName}>
      {clamped}
    </Link>
  );
}

export { DetailsLink };
