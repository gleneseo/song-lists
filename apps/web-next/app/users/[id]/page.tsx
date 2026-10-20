import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UserDetailsPanel } from "@/components/users/user-details-panel";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getUser } from "@/lib/queries/users";

async function UserDetails({ params }: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdmin();
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  return <UserDetailsPanel user={user} isSelf={user.id === adminId} />;
}

export default function UserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense
        fallback={<p className="text-muted-foreground">Loading user…</p>}
      >
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <UserDetails params={params} />
        </div>
      </Suspense>
    </main>
  );
}
