/** The parts of the browser this needs, so a test can stand in for them. */
interface Browser {
  navigation?:
    | {
        currentEntry: { index: number } | null;
        entries: () => { url: string | null }[];
      }
    | undefined;
  location: { origin: string };
  document: { referrer: string };
}

/**
 * Whether the page before this one in the browser's history is one of this
 * app's own -- so "go back" would land somewhere in the app, and not on a
 * new-tab page, another site, or nothing at all.
 *
 * The number of history entries can't say: a page opened in a fresh tab
 * already has one before it. The Navigation API names the previous entry
 * itself; browsers without it get the page that sent them here, which is a
 * blunter answer (it's only the first page of a visit) but errs towards
 * "no".
 */
function cameFromThisApp({ navigation, location, document }: Browser): boolean {
  if (navigation) {
    const current = navigation.currentEntry?.index ?? 0;
    const previous = navigation.entries()[current - 1]?.url;

    return (
      Boolean(previous) && new URL(previous ?? "").origin === location.origin
    );
  }

  return document.referrer.startsWith(`${location.origin}/`);
}

export { cameFromThisApp };
export type { Browser };
