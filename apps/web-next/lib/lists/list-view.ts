import { parsePage } from "@/lib/dashboard/pagination";

type SortColumn = "added" | "title" | "artist";
type SortDirection = "asc" | "desc";

/** The sort a list shows in until someone picks another. */
interface ListDefaults {
  sort: SortColumn;
  direction: SortDirection;
}

/**
 * Everything about how a list page is currently being looked at, as carried
 * in its URL. `defaults` rides along so links can leave out whatever is
 * still at the list's own default.
 */
interface ListView {
  query: string;
  sort: SortColumn;
  direction: SortDirection;
  page: number;
  defaults: ListDefaults;
}

type RawParams = Record<string, string | string[] | undefined>;

const SORT_COLUMNS: readonly SortColumn[] = ["added", "title", "artist"];

const MASTER_LIST_NAME = "The Master List";

/**
 * Lists read best alphabetically by title. The Master List is the whole
 * catalog, so it's grouped by artist instead.
 */
function defaultsFor(listName: string): ListDefaults {
  return {
    sort: listName === MASTER_LIST_NAME ? "artist" : "title",
    direction: "asc",
  };
}

/** Long enough for any real title or artist, short enough to keep a pasted essay out of the query. */
const MAX_QUERY_LENGTH = 100;

/** Which way a column sorts the first time it's chosen: newest first for dates, A to Z for text. */
const FIRST_CLICK_DIRECTION: Record<SortColumn, SortDirection> = {
  added: "desc",
  title: "asc",
  artist: "asc",
};

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Reads a list page's search params, falling back to `defaults` for any sort that's missing or unrecognised. */
function parseListView(params: RawParams, defaults: ListDefaults): ListView {
  const sort = SORT_COLUMNS.find(
    (column) => column === firstValue(params.sort),
  );
  const direction = firstValue(params.dir);

  return {
    query: (firstValue(params.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    sort: sort ?? defaults.sort,
    direction:
      direction === "asc" || direction === "desc"
        ? direction
        : defaults.direction,
    page: parsePage(params.page),
    defaults,
  };
}

/**
 * The view you land on by clicking `column`'s header: the active column
 * flips direction, any other starts in its natural direction. Sorting
 * always goes back to the first page; the search is kept.
 */
function sortedBy(view: ListView, column: SortColumn): ListView {
  const direction =
    view.sort === column
      ? view.direction === "asc"
        ? "desc"
        : "asc"
      : FIRST_CLICK_DIRECTION[column];

  return { ...view, sort: column, direction, page: 1 };
}

/** The same view with a new search: always the first page, since the results are different. */
function searchedFor(view: ListView, query: string): ListView {
  return { ...view, query: query.trim(), page: 1 };
}

/** A URL for `view` on `basePath`, leaving out anything still at the list's default so URLs stay short. */
function listHref(basePath: string, view: ListView): string {
  const params = new URLSearchParams();

  if (view.query) {
    params.set("q", view.query);
  }

  if (view.sort !== view.defaults.sort) {
    params.set("sort", view.sort);
  }

  if (view.direction !== view.defaults.direction) {
    params.set("dir", view.direction);
  }

  if (view.page !== 1) {
    params.set("page", String(view.page));
  }

  const search = params.toString();

  return search ? `${basePath}?${search}` : basePath;
}

export {
  defaultsFor,
  listHref,
  MASTER_LIST_NAME,
  parseListView,
  searchedFor,
  sortedBy,
};
export type { ListDefaults, ListView, SortColumn, SortDirection };
