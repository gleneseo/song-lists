import type { ReactNode } from "react";
import { DetailsSection as Section } from "@/components/details-section";
import { ENTITY_HEADING_ID } from "@/components/entity-heading";
import { ArtistLink, SongLink } from "@/components/entity-links";
import { ListPill } from "@/components/lists/list-pill";
import type { ArtistDetails } from "@/lib/artists/artist-details";
import { countLabel } from "@/lib/text/count-label";
import { formatDate } from "@/lib/text/format-date";

/**
 * Everything known about one artist. Shared by the full artist page and the
 * modal that opens over a list, like the song view.
 */
function ArtistDetailsView({
  details,
  headingLevel = "h1",
  footerAction,
}: {
  details: ArtistDetails;
  headingLevel?: "h1" | "h2";
  /** Something to show beside the footer line, such as an Edit button. */
  footerAction?: ReactNode;
}) {
  const Heading = headingLevel;

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 pr-8">
        <Heading
          id={ENTITY_HEADING_ID}
          className="text-xl leading-snug font-semibold wrap-anywhere"
        >
          {details.name}
        </Heading>
        <p className="text-sm text-muted-foreground">
          {countLabel(details.songs.length, "song")}
          {details.featuredOn.length > 0 &&
            ` · featured on ${details.featuredOn.length.toLocaleString("en-US")}`}
        </p>
      </header>

      {details.songs.length > 0 && (
        <Section title="Songs">
          <ul className="flex flex-col gap-1.5">
            {details.songs.map((song) => (
              <li key={song.id}>
                <SongLink id={song.id} className="font-medium">
                  {song.title}
                </SongLink>
                {song.covers.length > 0 && (
                  <span className="block text-xs text-muted-foreground">
                    Cover of{" "}
                    {song.covers.map((cover, index) => (
                      <span key={cover.id}>
                        {index > 0 && ", "}
                        <SongLink id={cover.id}>{cover.title}</SongLink> by{" "}
                        <ArtistLink id={cover.artistId}>
                          {cover.artistName}
                        </ArtistLink>
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {details.featuredOn.length > 0 && (
        <Section title="Featured on">
          <ul className="flex flex-col gap-1">
            {details.featuredOn.map((song) => (
              <li key={song.id}>
                <SongLink id={song.id} className="font-medium">
                  {song.title}
                </SongLink>{" "}
                <span className="text-muted-foreground">
                  by{" "}
                  <ArtistLink id={song.artistId}>{song.artistName}</ArtistLink>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {details.lists.length > 0 && (
        <Section title="On these lists">
          <ul className="flex flex-col gap-1.5">
            {details.lists.map((list) => (
              <li
                key={list.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                <ListPill id={list.id} name={list.name} />
                <span className="text-xs text-muted-foreground">
                  {countLabel(list.songCount, "song")}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Added to the catalog {formatDate(details.addedAt)}
        </p>
        {footerAction}
      </div>
    </article>
  );
}

export { ArtistDetailsView };
