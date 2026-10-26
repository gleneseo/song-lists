"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A song's cover art, hotlinked from the music service that supplied it.
 * Art that can't be loaded (the service moved it, or it's offline) leaves
 * nothing behind rather than a broken-image icon.
 */
function SongArtwork({
  src,
  alt,
  size,
}: {
  src: string;
  alt: string;
  size: number;
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
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- hotlinked from the music service, not something Next should optimize and re-serve
    <img
      ref={image}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        setFailed(true);
      }}
      className="shrink-0 rounded-md bg-muted object-cover ring-1 ring-foreground/10"
      style={{ width: size, height: size }}
    />
  );
}

export { SongArtwork };
