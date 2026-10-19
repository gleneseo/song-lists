import Link from "next/link";
import type { ReactNode } from "react";
import { ListPill } from "@/components/lists/list-pill";
import type { RelatedSong, SongDetails } from "@/lib/songs/song-details";
import { formatDate } from "@/lib/text/format-date";
import { formatList } from "@/lib/text/format-list";

/** The id the dialog uses to name itself after the song's heading. */
const SONG_HEADING_ID = "song-details-title";

function SongLink({ song }: { song: RelatedSong }) {
  return (
    <Link
      href={`/song/${song.id}`}
      className="font-medium underline-offset-4 hover:underline"
    >
      {song.title}
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

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
  const artist =
    details.featuredArtistNames.length > 0
      ? `${details.artistName} feat. ${formatList(details.featuredArtistNames)}`
      : details.artistName;

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 pr-8">
        <Heading
          id={SONG_HEADING_ID}
          className="text-xl leading-snug font-semibold wrap-anywhere"
        >
          {details.title}
        </Heading>
        <p className="text-muted-foreground wrap-anywhere">{artist}</p>
        {details.covers.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Cover of{" "}
            {details.covers.map((song, index) => (
              <span key={song.id}>
                {index > 0 && ", "}
                <SongLink song={song} /> by {song.artistName}
              </span>
            ))}
          </p>
        )}
      </header>

      {details.bio && (
        <Section title="Notes">
          <p className="whitespace-pre-line wrap-anywhere">{details.bio}</p>
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
                <SongLink song={song} />{" "}
                <span className="text-muted-foreground">
                  by {song.artistName}
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
              <li key={`${production.name}-${production.releaseYear}`}>
                <span className="font-medium">{production.name}</span>{" "}
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
        </p>
        {footerAction}
      </div>
    </article>
  );
}

export { SONG_HEADING_ID, SongDetailsView };
