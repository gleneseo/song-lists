import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountForms } from "@/components/account/account-forms";
import { getSession } from "@/lib/auth/auth";
import { getUser } from "@/lib/queries/users";

async function Account() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.id);

  if (!user) {
    redirect("/sign-in");
  }

  return <AccountForms name={user.name} email={user.email} />;
}

export default function AccountPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Your account</h1>
      <Suspense
        fallback={<p className="text-muted-foreground">Loading account…</p>}
      >
        <Account />
      </Suspense>
    </main>
  );
}
