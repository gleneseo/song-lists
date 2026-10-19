import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Pagination } from "@/lib/dashboard/pagination";

/** Previous / next links; `hrefForPage` builds each target so it can carry along a search or sort. */
function PaginationNav({
  hrefForPage,
  pagination,
  total,
  noun,
}: {
  hrefForPage: (page: number) => string;
  pagination: Pagination;
  total: number;
  noun: string;
}) {
  const { page, pageCount, from, to, hasPrevious, hasNext } = pagination;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 text-sm"
    >
      <p className="text-muted-foreground">
        {total === 0
          ? `No ${noun}`
          : `${from.toLocaleString("en-US")}–${to.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} ${noun}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          nativeButton={false}
          render={
            hasPrevious ? <Link href={hrefForPage(page - 1)} /> : <span />
          }
        >
          <ChevronLeft />
          Previous
        </Button>
        <span className="text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          nativeButton={false}
          render={hasNext ? <Link href={hrefForPage(page + 1)} /> : <span />}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

export { PaginationNav };
