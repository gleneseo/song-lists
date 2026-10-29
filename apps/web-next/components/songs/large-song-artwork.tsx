"use client";

import Image from "next/image";
import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ENTITY_HEADING_ID } from "@/components/entity-heading";
import { Button } from "@/components/ui/button";
import { canProxyArtwork } from "@/lib/songs/artwork-proxy";

const className = "h-auto w-full rounded-md bg-muted ring-1 ring-foreground/10";

/**
 * A song's cover art at the full width of where it is shown, as tall as that
 * makes it, however small the art is. It stands in for the song's details
 * (named by the album and its year, so a dialog around it is still named) until
 * the close button, or Escape, puts them back. Escape only closes this, not
 * the dialog around it: it is heard before the dialog can hear it.
 * The art is asked for at the biggest size there is, and told it will be
 * shown at the widest a screen can be, so that the server sends the biggest
 * it has rather than one sized to fit the dialog.
 */
function LargeSongArtwork({
  src,
  alt,
  heading,
  headingLevel,
  onClose,
}: {
  src: string;
  alt: string;
  /** What the heading says, which is what the art is of: the album and its year */
  heading: string;
  headingLevel: "h1" | "h2";
  onClose: () => void;
}) {
  const Heading = headingLevel;
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape, true);

    return () => {
      window.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [onClose]);

  // The server's HTML may reach the browser, and fail to load, before React is
  // listening for the error, so look again once it is.
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  return (
    <div data-artwork-viewer className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <Heading
          id={ENTITY_HEADING_ID}
          className="text-xl leading-snug font-semibold wrap-anywhere"
        >
          {heading}
        </Heading>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          autoFocus
          onClick={onClose}
        >
          <XIcon />
          <span className="sr-only">Close large album art</span>
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="text-muted-foreground">
          The album art couldn&rsquo;t be loaded.
        </p>
      ) : canProxyArtwork(src) ? (
        <Image
          ref={image}
          src={src}
          alt={alt}
          width={1200}
          height={1200}
          sizes="3840px"
          loading="eager"
          onError={() => {
            setFailed(true);
          }}
          className={className}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- an address of the admin's own choosing, which Next isn't set up to fetch
        <img
          ref={image}
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed(true);
          }}
          className={className}
        />
      )}
    </div>
  );
}

export { LargeSongArtwork };
