interface Pagination {
  page: number;
  pageCount: number;
  offset: number;
  limit: number;
  /** 1-based position of the first item on the page, or 0 when there are none. */
  from: number;
  /** 1-based position of the last item on the page, or 0 when there are none. */
  to: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** Reads a `?page=` search param, falling back to the first page for anything that isn't a positive whole number. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number(value);

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Works out the window of `total` items shown on `page`, clamping a page past the end back to the last one. */
function paginate(total: number, page: number, pageSize: number): Pagination {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const offset = (current - 1) * pageSize;

  return {
    page: current,
    pageCount,
    offset,
    limit: pageSize,
    from: total === 0 ? 0 : offset + 1,
    to: Math.min(offset + pageSize, total),
    hasPrevious: current > 1,
    hasNext: current < pageCount,
  };
}

export { paginate, parsePage };
export type { Pagination };
