import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * The services whose cover art this server fetches, resizes, and keeps, so a
 * browser asks this server for it rather than the service. The first is where
 * iTunes keeps its art, the second the Cover Art Archive.
 */
const ARTWORK_REMOTE_PATTERNS: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "**.mzstatic.com",
    pathname: "/**",
    search: "",
  },
  {
    protocol: "https",
    hostname: "coverartarchive.org",
    pathname: "/release-group/**",
    search: "",
  },
];

/**
 * Whether cover art can be fetched through this server: one of the app's own
 * images, or one from a service above. Any other address (an admin's own
 * choice) is shown straight from where it is. Keep this in step with
 * {@link ARTWORK_REMOTE_PATTERNS}.
 */
function canProxyArtwork(src: string): boolean {
  if (src.startsWith("/album-art/")) {
    return true;
  }

  try {
    const { protocol, hostname, pathname, search } = new URL(src);

    return (
      protocol === "https:" &&
      search === "" &&
      (hostname.endsWith(".mzstatic.com") ||
        (hostname === "coverartarchive.org" &&
          pathname.startsWith("/release-group/")))
    );
  } catch {
    return false;
  }
}

export { ARTWORK_REMOTE_PATTERNS, canProxyArtwork };
