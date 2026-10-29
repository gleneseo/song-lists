"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { canProxyArtwork } from "@/lib/songs/artwork-proxy";

/**
 * A song's cover art. Art from the music services this app knows is fetched
 * through this server, which resizes and keeps it; any other address is
 * shown straight from where it is.
 * Art that can't be loaded (the service moved it, or it's offline) leaves
 * the fallback, if any, rather than a broken-image icon.
 */
function SongArtwork({
  src,
  alt,
  size,
  fallback = null,
}: {
  src: string;
  alt: string;
  size: number;
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);

  // The server's HTML may reach the browser, and fail to load, before React is
  // listening for the error, so look again once it is.
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    return fallback;
  }

  const className =
    "shrink-0 rounded-md bg-muted object-cover ring-1 ring-foreground/10";
  const onError = () => {
    setFailed(true);
  };

  return canProxyArtwork(src) ? (
    <Image
      ref={image}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={onError}
      className={className}
      style={{ width: size, height: size }}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- an address of the admin's own choosing, which Next isn't set up to fetch
    <img
      ref={image}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={onError}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

export { SongArtwork };
