import { artworkUrlAtSize } from "@song-lists/song-metadata/artwork";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { DetailsSection as Section } from "@/components/details-section";
import { ENTITY_HEADING_ID } from "@/components/entity-heading";
import {
  ArtistLink,
  ProductionLink,
  SongLink,
} from "@/components/entity-links";
import { NoteLines } from "@/components/songs/note-lines";
import { SongArtwork } from "@/components/songs/song-artwork";
import { ListPill } from "@/components/lists/list-pill";
import type { SongDetails } from "@/lib/songs/song-details";
import { youtubeSearchUrl } from "@/lib/songs/youtube-link";
import { formatDate } from "@/lib/text/format-date";

/** The art's size on the page; it's asked for at twice this, for sharp screens. */
const ARTWORK_SIZE = 112;

/**
 * Everything known about one song. Shared by the full song page and the
 * modal that opens over a list, so the two always show the same thing.
 */
function SongDetailsView({
  details,
  headingLevel = "h1",
  footerAction,
}: {
  details: SongDetails;
  headingLevel?: "h1" | "h2";
  /** Something to show beside the footer line, such as an Edit button. */
  footerAction?: ReactNode;
}) {
  const Heading = headingLevel;
  const artworkUrl = details.metadata?.artworkUrl ?? null;
  const albumName = details.metadata?.albumName ?? null;
  const albumLine = [albumName, details.metadata?.releaseYear]
    .filter((part) => part !== null && part !== undefined)
    .join(" · ");
  return (
    <article className="flex flex-col gap-5">
      <header className="flex gap-4 pr-8">
        {artworkUrl && (
          <SongArtwork
            src={artworkUrlAtSize(artworkUrl, ARTWORK_SIZE * 2)}
            alt={albumName ? `Album art for ${albumName}` : "Album art"}
            size={ARTWORK_SIZE}
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <Heading
            id={ENTITY_HEADING_ID}
            className="text-xl leading-snug font-semibold wrap-anywhere"
          >
            {details.title}
          </Heading>
          <p className="text-muted-foreground wrap-anywhere">
            <ArtistLink id={details.artistId}>{details.artistName}</ArtistLink>
            {details.featuredArtists.length > 0 && (
              <>
                {" feat. "}
                {details.featuredArtists.map((artist, index) => (
                  <span key={artist.id}>
                    {index > 0 && ", "}
                    <ArtistLink id={artist.id}>{artist.name}</ArtistLink>
                  </span>
                ))}
              </>
            )}
          </p>
          {details.covers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Cover of{" "}
              {details.covers.map((song, index) => (
                <span key={song.id}>
                  {index > 0 && ", "}
                  <SongLink id={song.id} className="font-medium">
                    {song.title}
                  </SongLink>{" "}
                  by{" "}
                  <ArtistLink id={song.artistId}>{song.artistName}</ArtistLink>
                </span>
              ))}
            </p>
          )}
          {albumLine && (
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {albumLine}
            </p>
          )}
        </div>
      </header>

      <a
        href={youtubeSearchUrl(details.title, details.artistName)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Listen on YouTube
        <ExternalLink aria-hidden className="size-3.5" />
      </a>

      {details.bio && (
        <Section title="Notes">
          <NoteLines notes={details.bio} />
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
                  added by {list.addedBy} · {formatDate(list.addedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {details.coveredBy.length > 0 && (
        <Section title="Other versions">
          <ul className="flex flex-col gap-1">
            {details.coveredBy.map((song) => (
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

      {details.productions.length > 0 && (
        <Section title="Appears in">
          <ul className="flex flex-col gap-1">
            {details.productions.map((production) => (
              <li key={production.id}>
                <ProductionLink id={production.id} className="font-medium">
                  {production.name}
                </ProductionLink>{" "}
                <span className="text-muted-foreground">
                  ({production.releaseYear}) · {production.typeName}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {details.advocates.length > 0 && (
        <Section title="Championed by">
          <ul className="flex flex-col gap-1">
            {details.advocates.map((advocate) => (
              <li key={advocate.name}>
                {advocate.name}{" "}
                <span className="text-xs text-muted-foreground">
                  since {formatDate(advocate.since)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          Added to the catalog {formatDate(details.addedAt)}
          {details.metadata && " · Album details via iTunes"}
        </p>
        {footerAction}
      </div>
    </article>
  );
}

export { SongDetailsView };
