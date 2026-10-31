import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getManagedLists } from "@/lib/queries/lists";
import { countLabel } from "@/lib/text/count-label";

const metadata: Metadata = { title: "Manage lists" };

async function ManagedLists() {
  await requireAdmin();
  const lists = await getManagedLists();

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {countLabel(lists.length, "list")}
        </p>
        <Button nativeButton={false} render={<Link href="/admin/lists/new" />}>
          New list
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
        {lists.map((list) => (
          <li key={list.id}>
            <Link
              href={`/admin/lists/${list.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="truncate font-medium">{list.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {countLabel(list.songCount, "song")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function ManageListsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold">Manage lists</h1>
      <Suspense
        fallback={<p className="mt-6 text-muted-foreground">Loading lists…</p>}
      >
        <ManagedLists />
      </Suspense>
    </main>
  );
}

export { metadata };
