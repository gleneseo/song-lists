import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListForm } from "@/components/lists/list-form";
import { requireAdmin } from "@/lib/auth/require-admin";
import { MASTER_LIST_NAME } from "@/lib/lists/list-view";
import { getListSummary } from "@/lib/queries/lists";

async function EditList({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const listId = Number(id);
  const summary = Number.isInteger(listId)
    ? await getListSummary(listId)
    : null;

  if (!summary) {
    notFound();
  }

  return (
    <ListForm
      list={{
        id: summary.id,
        name: summary.name,
        extraColumns: summary.extraColumns,
        songCount: summary.songCount,
        isMaster: summary.name === MASTER_LIST_NAME,
      }}
    />
  );
}

export default function EditListPage({
  params,
}: PageProps<"/admin/lists/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <EditList params={params} />
        </div>
      </Suspense>
    </main>
  );
}
