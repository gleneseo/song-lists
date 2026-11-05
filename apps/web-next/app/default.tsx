import { notFound } from "next/navigation";

/**
 * What the main page slot shows for an address nothing else in `app/` claims.
 * The modal slot's catch-all answers every address, so Next requires the main
 * slot to answer them all too, even the ones that are not pages (the sign-in
 * routes and the icons); this makes any such address a plain not-found.
 */
export default function Unmatched() {
  notFound();
}
