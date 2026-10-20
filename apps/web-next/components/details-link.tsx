import { ClampedText } from "@/components/clamped-text";
import { EntityAnchor } from "@/components/entity-anchor";

const linkClassName =
  "block rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * A name as a link to its details -- a modal over the current page, or the
 * full page when opened directly. Used for songs, artists, and productions.
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
  return (
    <EntityAnchor href={href} className={linkClassName}>
      <ClampedText text={text} lines={lines} className={className} />
    </EntityAnchor>
  );
}

export { DetailsLink };
