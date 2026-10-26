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

export { artworkUrlAtSize };
