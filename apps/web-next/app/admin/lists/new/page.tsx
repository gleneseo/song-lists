import type { Metadata } from "next";
import { Suspense } from "react";
import { ListForm } from "@/components/lists/list-form";
import { requireAdmin } from "@/lib/auth/require-admin";

const metadata: Metadata = { title: "New list" };

async function NewList() {
  await requireAdmin();

  return <ListForm />;
}

export default function NewListPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <NewList />
        </div>
      </Suspense>
    </main>
  );
}

export { metadata };
