/**
 * The same artwork at another size. iTunes names the size in the image's
 * address (`.../100x100bb.jpg`) and serves any square size from it; an
 * address without that part is returned as it is.
 */
function artworkUrlAtSize(artworkUrl: string, pixels: number): string {
  return artworkUrl.replace(
    /\/\d+x\d+(bb)?\.(jpg|png)$/,
    (_, suffix: string | undefined, extension: string) => {
      const size = String(pixels);

      return `/${size}x${size}${suffix ?? ""}.${extension}`;
    },
  );
}

export { artworkUrlAtSize };
