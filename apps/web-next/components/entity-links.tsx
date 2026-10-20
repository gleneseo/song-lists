"use client";

import type { ReactNode } from "react";
import { EntityAnchor } from "@/components/entity-anchor";
import { useInEntityModal } from "@/components/entity-modal-context";

const linkClassName = "underline-offset-4 hover:underline";

/**
 * An inline link to an entity's details. Inside a modal it replaces the
 * current history entry instead of pushing a new one, so one close steps back
 * out of the whole chain of modals.
 */
function EntityLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const replace = useInEntityModal();

  return (
    <EntityAnchor
      href={href}
      replace={replace}
      className={`${linkClassName} ${className}`}
    >
      {children}
    </EntityAnchor>
  );
}

/** An inline link to a song, opening its details. */
function SongLink({
  id,
  children,
  className = "",
}: {
  id: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <EntityLink href={`/song/${id}`} className={className}>
      {children}
    </EntityLink>
  );
}

/** An inline link to an artist, opening their details. */
function ArtistLink({
  id,
  children,
  className = "",
}: {
  id: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <EntityLink href={`/artist/${id}`} className={className}>
      {children}
    </EntityLink>
  );
}

/** An inline link to a production, opening its details. */
function ProductionLink({
  id,
  children,
  className = "",
}: {
  id: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <EntityLink href={`/production/${id}`} className={className}>
      {children}
    </EntityLink>
  );
}

export { ArtistLink, ProductionLink, SongLink };
