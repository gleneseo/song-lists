import type { Metadata } from "next";
import { Suspense } from "react";
import { UserCreateForm } from "@/components/users/user-create-form";
import { requireAdmin } from "@/lib/auth/require-admin";

const metadata: Metadata = { title: "New user" };

async function NewUser() {
  await requireAdmin();

  return <UserCreateForm />;
}

export default function NewUserPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <NewUser />
        </div>
      </Suspense>
    </main>
  );
}

export { metadata };
