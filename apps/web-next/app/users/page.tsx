import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getUsers } from "@/lib/queries/users";
import { countLabel } from "@/lib/text/count-label";

const metadata: Metadata = { title: "Users" };

async function Users() {
  await requireAdmin();
  const users = await getUsers();

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {countLabel(users.length, "user")}
        </p>
        <Button nativeButton={false} render={<Link href="/users/new" />}>
          New user
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
        {users.map((user) => (
          <li key={user.id}>
            <Link
              href={`/users/${user.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {user.email}
                </span>
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {user.deactivatedAt ? "Deactivated" : user.role}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function UsersPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold">Users</h1>
      <Suspense
        fallback={<p className="mt-6 text-muted-foreground">Loading users…</p>}
      >
        <Users />
      </Suspense>
    </main>
  );
}

export { metadata };
