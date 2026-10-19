import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ClampedText } from "@/components/clamped-text";
import {
  listHref,
  sortedBy,
  type ListView,
  type SortColumn,
} from "@/lib/lists/list-view";
import type { ListEntry } from "@/lib/queries/lists";
import { formatDate } from "@/lib/text/format-date";
import { coverOfLabel, featuredArtistsLabel } from "@/lib/text/song-labels";

/** A column header that, when clicked, sorts the list by that column (or flips its direction). */
function SortHeader({
  column,
  label,
  view,
  basePath,
  className = "",
}: {
  column: SortColumn;
  label: string;
  view: ListView;
  basePath: string;
  className?: string;
}) {
  const active = view.sort === column;
  const Icon = !active
    ? ArrowUpDown
    : view.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={
        active
          ? view.direction === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
      className={`px-2 py-2 font-medium ${className}`}
    >
      <Link
        href={listHref(basePath, sortedBy(view, column))}
        className={`inline-flex items-center gap-1 rounded transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 ${active ? "text-foreground" : ""}`}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={`size-3.5 ${active ? "" : "opacity-50"}`}
        />
      </Link>
    </th>
  );
}

/** One page of a list's songs, with sortable Title, Artist, and Added columns. */
function ListSongTable({
  entries,
  firstPosition,
  view,
  basePath,
}: {
  entries: ListEntry[];
  /** The 1-based position, within the filtered and sorted list, of the first row. */
  firstPosition: number;
  view: ListView;
  basePath: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-12 px-2 py-2 text-right font-medium">
              <span className="sr-only">Position</span>
              <span aria-hidden="true">#</span>
            </th>
            <SortHeader
              column="title"
              label="Title"
              view={view}
              basePath={basePath}
              className="min-w-44"
            />
            <SortHeader
              column="artist"
              label="Artist"
              view={view}
              basePath={basePath}
              className="min-w-36"
            />
            <th
              scope="col"
              className="hidden px-2 py-2 font-medium whitespace-nowrap md:table-cell"
            >
              Added by
            </th>
            <SortHeader
              column="added"
              label="Added"
              view={view}
              basePath={basePath}
              className="text-right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry, index) => {
            const featured = featuredArtistsLabel(entry.song.featuredArtists);
            const cover = coverOfLabel(entry.song);

            return (
              <tr key={entry.id} className="align-top">
                <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">
                  {(firstPosition + index).toLocaleString("en-US")}
                </td>
                <td className="px-2 py-2.5">
                  <ClampedText
                    text={entry.song.title}
                    className="font-medium"
                  />
                  {cover && (
                    <ClampedText
                      lines={1}
                      text={`Cover of ${cover}`}
                      className="text-xs text-muted-foreground"
                    />
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <ClampedText text={entry.song.artist.name} />
                  {featured && (
                    <ClampedText
                      lines={1}
                      text={`feat. ${featured}`}
                      className="text-xs text-muted-foreground"
                    />
                  )}
                </td>
                <td className="hidden px-2 py-2.5 text-muted-foreground md:table-cell">
                  {entry.addedBy}
                </td>
                <td className="px-2 py-2.5 text-right whitespace-nowrap text-muted-foreground">
                  {formatDate(entry.addedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { ListSongTable };
