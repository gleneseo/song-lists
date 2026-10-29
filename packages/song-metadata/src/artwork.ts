/** The sizes the Cover Art Archive serves a front cover in. */
const COVER_ART_SIZES = [250, 500, 1200] as const;

/**
 * The same artwork at another size. iTunes names the size in the image's
 * address (`.../100x100bb.jpg`) and serves any square size from it. The
 * Cover Art Archive serves a few sizes (`.../front-500`) and an address
 * without one (`.../front`) is given the smallest that is big enough. An
 * address in neither form is returned as it is.
 */
function artworkUrlAtSize(artworkUrl: string, pixels: number): string {
  if (/\/release-group\/[^/]+\/front$/.test(artworkUrl)) {
    const size =
      COVER_ART_SIZES.find((available) => available >= pixels) ??
      COVER_ART_SIZES[COVER_ART_SIZES.length - 1];

    return `${artworkUrl}-${String(size)}`;
  }

  return artworkUrl.replace(
    /\/\d+x\d+(bb)?\.(jpg|png)$/,
    (_, suffix: string | undefined, extension: string) => {
      const size = String(pixels);

      return `/${size}x${size}${suffix ?? ""}.${extension}`;
    },
  );
}

/**
 * A size far beyond any cover iTunes holds: it serves the largest the source
 * has, and no more, for any size above that (5000 pixels got the 3000 a
 * cover was kept at).
 */
const ITUNES_LARGEST_PIXELS = 5000;

/**
 * The same artwork at the largest size we can get it. The Cover Art Archive
 * serves the cover it holds, at its own size, from the address without a
 * size in it, while its sized covers stop at 1200 pixels. iTunes serves the
 * largest it has when asked for more than that. An address in neither form,
 * such as a file of our own, is returned as it is.
 */
function largestArtworkUrl(artworkUrl: string): string {
  const archive = /^(.*\/release-group\/[^/]+\/front)(?:-\d+)?$/.exec(
    artworkUrl,
  );

  return archive?.[1] ?? artworkUrlAtSize(artworkUrl, ITUNES_LARGEST_PIXELS);
}

export { artworkUrlAtSize, largestArtworkUrl };
