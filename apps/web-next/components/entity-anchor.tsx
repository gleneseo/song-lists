"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import {
  ENTITY_LINK_ATTRIBUTE,
  LIVE_ATTRIBUTE,
  PENDING_HREF_KEY,
} from "@/lib/entity-links/pending-click-script";

declare global {
  interface Window {
    __pendingEntityHref?: string | undefined;
  }
}

/**
 * A link to an entity's details: a modal over the current page, or the full
 * page when opened directly.
 *
 * It's a real link in the server's HTML. A click before React has hydrated it
 * would be a plain browser navigation, skipping the modal's route
 * interception, so a script in the page's head (see
 * `PENDING_ENTITY_CLICK_SCRIPT`) holds such a click back. Once this link is
 * live it marks itself so, and replays any click that was held for it through
 * the router -- so an early click opens the modal, a moment late, instead of
 * loading the full page or doing nothing.
 */
function EntityAnchor({
  href,
  replace = false,
  className,
  children,
}: {
  href: string;
  /** Replace the current history entry rather than adding one, as inside a modal. */
  replace?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const anchor = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    anchor.current?.setAttribute(LIVE_ATTRIBUTE, "");

    if (window[PENDING_HREF_KEY] === href) {
      window[PENDING_HREF_KEY] = undefined;

      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    }
  }, [href, replace, router]);

  return (
    <Link
      ref={anchor}
      href={href}
      replace={replace}
      className={className}
      {...{ [ENTITY_LINK_ATTRIBUTE]: "" }}
    >
      {children}
    </Link>
  );
}

export { EntityAnchor };
