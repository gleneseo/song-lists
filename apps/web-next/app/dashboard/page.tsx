import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/dashboard/card-skeleton";
import {
  ActivitySection,
  ActivitySummaryLine,
  HistorySection,
  LeaderboardSection,
  ListsSection,
  MilestonesSection,
  RecentAdditionsSection,
  SongOfTheDaySection,
  StatsSection,
  TopArtistsSection,
} from "@/components/dashboard/sections";
import { getSession } from "@/lib/auth/auth";
import { formatDate } from "@/lib/text/format-date";

const metadata: Metadata = { title: "Dashboard" };

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <CardSkeleton key={index} rows={2} />
      ))}
    </div>
  );
}

async function Dashboard() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const { id: userId, name, createdAt } = session.user;
  // Read once, after the session, so every section agrees on "now" and the
  // time is only touched once the page is already rendering per request.
  const now = new Date();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">
            Welcome back, {name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Member since {formatDate(createdAt)}
          </p>
          <Suspense fallback={<p className="text-sm">&nbsp;</p>}>
            <ActivitySummaryLine userId={userId} />
          </Suspense>
        </div>
        <div className="flex gap-2">
          <Button nativeButton={false} render={<Link href="/songs/new" />}>
            <Plus />
            Add song
          </Button>
        </div>
      </header>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection userId={userId} />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={3} />}>
        <ListsSection userId={userId} now={now} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Suspense fallback={<CardSkeleton rows={8} />}>
            <HistorySection userId={userId} now={now} />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={5} />}>
            <ActivitySection userId={userId} />
          </Suspense>
        </div>
        <div className="flex flex-col gap-6">
          <Suspense fallback={<CardSkeleton rows={3} />}>
            <SongOfTheDaySection now={now} />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={3} />}>
            <MilestonesSection userId={userId} />
          </Suspense>
          <Suspense fallback={<CardSkeleton rows={5} />}>
            <TopArtistsSection userId={userId} />
          </Suspense>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <LeaderboardSection userId={userId} />
        </Suspense>
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <RecentAdditionsSection />
        </Suspense>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Suspense
        fallback={
          <p className="text-muted-foreground">Loading your dashboard…</p>
        }
      >
        <Dashboard />
      </Suspense>
    </main>
  );
}

export { metadata };
