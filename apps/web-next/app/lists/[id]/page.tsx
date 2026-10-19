import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ListSearch } from "@/components/lists/list-search";
import { ListSongTable } from "@/components/lists/list-song-table";
import { PaginationNav } from "@/components/pagination-nav";
import { getSession } from "@/lib/auth/auth";
import { paginate } from "@/lib/dashboard/pagination";
import { showsProductions, sortsFor } from "@/lib/lists/extra-columns";
import { defaultsFor, listHref, parseListView } from "@/lib/lists/list-view";
import {
  countListEntries,
  getListEntries,
  getListSummary,
} from "@/lib/queries/lists";
import { countLabel } from "@/lib/text/count-label";
import { formatDate } from "@/lib/text/format-date";

const PAGE_SIZE = 50;

async function List({ params, searchParams }: PageProps<"/lists/[id]">) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const listId = Number(id);
  const summary = Number.isInteger(listId)
    ? await getListSummary(listId)
    : null;

  if (!summary) {
    notFound();
  }

  const { extraColumns } = summary;
  const requested = parseListView(
    await searchParams,
    defaultsFor(summary.name),
    sortsFor(extraColumns),
  );
  const matching = await countListEntries(
    summary.id,
    requested.query,
    extraColumns,
  );
  const pagination = paginate(matching, requested.page, PAGE_SIZE);
  // A page past the end is clamped, so every link below uses the real page.
  const view = { ...requested, page: pagination.page };
  const basePath = `/lists/${summary.id}`;
  const hrefForPage = (page: number) => listHref(basePath, { ...view, page });
  const entries = await getListEntries(
    summary.id,
    view,
    extraColumns,
    pagination.offset,
    pagination.limit,
  );

  return (
    <>
      <h1 className="text-3xl font-bold">{summary.name}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {countLabel(summary.songCount, "song")} · created{" "}
        {formatDate(summary.createdAt)}
      </p>
      <div className="mb-4 flex flex-col gap-2">
        <ListSearch
          basePath={basePath}
          view={view}
          placeholder={
            showsProductions(extraColumns)
              ? "Search this list by title, artist, or production…"
              : "Search this list by title or artist…"
          }
        />
        {view.query && (
          <p
            className="text-sm wrap-anywhere text-muted-foreground"
            aria-live="polite"
          >
            {matching.toLocaleString("en-US")} of{" "}
            {summary.songCount.toLocaleString("en-US")} songs match &ldquo;
            {view.query}&rdquo;
          </p>
        )}
      </div>
      {pagination.pageCount > 1 && (
        <div className="mb-3">
          <PaginationNav
            label="Pagination (top)"
            hrefForPage={hrefForPage}
            pagination={pagination}
            total={matching}
            noun="songs"
          />
        </div>
      )}
      {entries.length === 0 ? (
        <p className="py-10 text-center wrap-anywhere text-muted-foreground">
          {view.query
            ? `No songs on this list match “${view.query}”.`
            : "Nothing on this list yet."}
        </p>
      ) : (
        <ListSongTable
          entries={entries}
          firstPosition={pagination.from}
          view={view}
          basePath={basePath}
          extraColumns={extraColumns}
        />
      )}
      <div className="mt-6">
        <PaginationNav
          label="Pagination (bottom)"
          hrefForPage={hrefForPage}
          pagination={pagination}
          total={matching}
          noun="songs"
        />
      </div>
    </>
  );
}

export default function ListPage(props: PageProps<"/lists/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Suspense
        fallback={<p className="text-muted-foreground">Loading list…</p>}
      >
        <List {...props} />
      </Suspense>
    </main>
  );
}
