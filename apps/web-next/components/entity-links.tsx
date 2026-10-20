"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useInEntityModal } from "@/components/entity-modal-context";

const linkClassName = "underline-offset-4 hover:underline";

/**
 * Inside a modal, a link to another entity replaces the current history
 * entry instead of pushing a new one, so one close steps back out of the
 * whole chain of modals.
 */
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
  const replace = useInEntityModal();

  return (
    <Link
      href={`/song/${id}`}
      replace={replace}
      className={`${linkClassName} ${className}`}
    >
      {children}
    </Link>
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
  const replace = useInEntityModal();

  return (
    <Link
      href={`/artist/${id}`}
      replace={replace}
      className={`${linkClassName} ${className}`}
    >
      {children}
    </Link>
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
  const replace = useInEntityModal();

  return (
    <Link
      href={`/production/${id}`}
      replace={replace}
      className={`${linkClassName} ${className}`}
    >
      {children}
    </Link>
  );
}

export { ArtistLink, ProductionLink, SongLink };
