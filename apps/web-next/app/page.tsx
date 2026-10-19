import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ListMusic, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/auth";

/** Signed-in visitors have no use for the sales pitch -- send them to their dashboard. */
async function RedirectIfSignedIn() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return null;
}

export default function Page() {
  return (
    <main className="flex flex-col">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="mb-6 text-5xl font-bold">
          Browse and build song lists together.
        </h1>
        <p className="mb-10 text-lg text-muted-foreground">
          Search the catalog, curate lists, and keep track of the songs your
          crew cares about.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/sign-up" />}
          >
            Get started
          </Button>
          <p className="text-sm text-muted-foreground">
            Free to join. No credit card required.
          </p>
        </div>
      </section>

      <section className="border-t border-border py-20">
        <div className="mx-auto grid max-w-4xl gap-10 px-4 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <Search className="size-6 text-primary" />
            <h3 className="text-lg font-semibold">Search the catalog</h3>
            <p className="text-sm text-muted-foreground">
              Find any song or artist in the shared catalog in a few keystrokes.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <ListMusic className="size-6 text-primary" />
            <h3 className="text-lg font-semibold">Curate lists</h3>
            <p className="text-sm text-muted-foreground">
              Group songs into themed lists, from best covers to workout jams.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Users className="size-6 text-primary" />
            <h3 className="text-lg font-semibold">Share with your crew</h3>
            <p className="text-sm text-muted-foreground">
              Keep everyone pointed at the same catalog and the same lists.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
