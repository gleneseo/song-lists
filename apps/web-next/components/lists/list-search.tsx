"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listHref, searchedFor, type ListView } from "@/lib/lists/list-view";

/**
 * A search box that narrows a list by title or artist. Typing waits for a
 * short pause, then writes the search into the URL so the server filters the
 * whole list (not just the visible page) and the result is shareable.
 */
function ListSearch({
  basePath,
  view,
  placeholder,
}: {
  basePath: string;
  view: ListView;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(view.query);
  const debounced = useDebouncedValue(value);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const query = debounced.trim();

    if (query === view.query) {
      return;
    }

    startTransition(() => {
      router.replace(listHref(basePath, searchedFor(view, query)), {
        scroll: false,
      });
    });
  }, [debounced, view, basePath, router]);

  return (
    <Input
      type="search"
      placeholder={placeholder}
      aria-label="Search this list"
      aria-busy={isPending}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
      }}
    />
  );
}

export { ListSearch };
