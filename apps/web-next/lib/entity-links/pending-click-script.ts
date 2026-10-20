/**
 * The attribute every link to an entity's details carries, so the script
 * below can tell them from other links.
 */
const ENTITY_LINK_ATTRIBUTE = "data-entity-link";

/**
 * Set on an entity link by React once it's live -- once a click on it is
 * handled by Next's router rather than the browser.
 */
const LIVE_ATTRIBUTE = "data-live";

/** Where the script leaves the href of a click it held back, for the link to pick up. */
const PENDING_HREF_KEY = "__pendingEntityHref";

/** How long a held click waits for its link to come alive before going to the page directly. */
const GIVE_UP_AFTER_MS = 10_000;

/**
 * Runs in the page's head, before React. A link to an entity's details is a
 * real link in the server's HTML, so a click that lands before React has
 * hydrated is a plain browser navigation -- the full page, not the modal over
 * the one you're on. This holds such a click back and remembers where it was
 * headed; the link replays it through the router as soon as it's live. If
 * that never happens (the scripts failed to load), the click goes to the
 * page the plain way after a pause, so it isn't lost.
 *
 * A click with a modifier or a non-primary button is left alone, so opening
 * a link in a new tab still works.
 */
const PENDING_ENTITY_CLICK_SCRIPT = `
(function () {
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target instanceof Element ? event.target.closest('a[${ENTITY_LINK_ATTRIBUTE}]') : null;
    if (!link || link.hasAttribute('${LIVE_ATTRIBUTE}')) return;
    event.preventDefault();
    var href = link.getAttribute('href');
    window.${PENDING_HREF_KEY} = href;
    setTimeout(function () {
      if (window.${PENDING_HREF_KEY} === href) window.location.href = href;
    }, ${GIVE_UP_AFTER_MS});
  }, true);
})();
`;

export {
  ENTITY_LINK_ATTRIBUTE,
  LIVE_ATTRIBUTE,
  PENDING_ENTITY_CLICK_SCRIPT,
  PENDING_HREF_KEY,
};
