import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CardSkeleton } from "@/components/dashboard/card-skeleton";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/lists/list-card";
import { getAdminUserId } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/auth";
import { getListsOverview } from "@/lib/queries/lists";
import { countLabel } from "@/lib/text/count-label";

const metadata: Metadata = { title: "Lists" };

async function Lists() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const now = new Date();
  const lists = await getListsOverview(session.user.id);
  const isAdmin = (await getAdminUserId()) !== null;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {countLabel(lists.length, "list")}
        </p>
        {isAdmin && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/admin/lists" />}
          >
            Manage lists
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} now={now} />
        ))}
      </div>
    </>
  );
}

export default function ListsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold">Lists</h1>
      <Suspense
        fallback={
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <CardSkeleton key={index} rows={2} />
            ))}
          </div>
        }
      >
        <Lists />
      </Suspense>
    </main>
  );
}

export { metadata };
