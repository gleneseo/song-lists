const DEFAULT_APP_TITLE = "Song Lists";

/** The title to use for the app: the one configured, trimmed, or the default when there is none. */
function resolveAppTitle(configured: string | undefined): string {
  return configured?.trim() || DEFAULT_APP_TITLE;
}

/**
 * What the app calls itself in the header and in the browser tab. Set
 * `NEXT_PUBLIC_APP_TITLE` to change it; the `NEXT_PUBLIC_` prefix is what
 * lets the header, a client component, read it, and it is fixed when the app
 * is built.
 */
const APP_TITLE = resolveAppTitle(process.env.NEXT_PUBLIC_APP_TITLE);

export { APP_TITLE, resolveAppTitle };
