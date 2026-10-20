import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DetailsLink } from "@/components/details-link";
import {
  ArtistLink,
  ProductionLink,
  SongLink,
} from "@/components/entity-links";
import { SongTitleLink } from "@/components/songs/song-title-link";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

/**
 * Rendering on the server is what the browser has before React takes over.
 * The link has to be a real, working link there -- and carry the marker the
 * script in the page's head uses to hold back a click that arrives before
 * the link is live, since that click would otherwise load the full page.
 */
describe("links to an entity's details, as the server renders them", () => {
  const links: Record<string, [string, () => ReactElement]> = {
    SongLink: ["/song/1", () => <SongLink id={1}>Angie</SongLink>],
    ArtistLink: ["/artist/2", () => <ArtistLink id={2}>Devo</ArtistLink>],
    ProductionLink: [
      "/production/3",
      () => <ProductionLink id={3}>Heavy Metal</ProductionLink>,
    ],
    DetailsLink: [
      "/song/4",
      () => <DetailsLink href="/song/4" text="Satisfaction" />,
    ],
    SongTitleLink: [
      "/song/5",
      () => <SongTitleLink id={5} title="Paint It, Black" />,
    ],
  };

  it.each(Object.keys(links))(
    "should render %s as a real link marked as an entity link",
    (name) => {
      const [href, render] = links[name] ?? ["", () => <span />];
      const html = renderToString(render());

      expect(html).toContain(`href="${href}"`);
      expect(html).toContain("data-entity-link");
    },
  );

  it.each(Object.keys(links))(
    "should not render %s as live, since React hasn't taken over yet",
    (name) => {
      const [, render] = links[name] ?? ["", () => <span />];

      expect(renderToString(render())).not.toContain("data-live");
    },
  );

  it("should still show the text", () => {
    expect(renderToString(<ArtistLink id={2}>Devo</ArtistLink>)).toContain(
      "Devo",
    );
  });
});
