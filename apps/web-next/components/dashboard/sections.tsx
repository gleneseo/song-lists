import Link from "next/link";
import { ArrowRight, ListMusic, Mic2, Music, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/lists/list-card";
import {
  bucketByYear,
  summarizeActivity,
} from "@/lib/dashboard/activity-by-year";
import { buildLeaderboard } from "@/lib/dashboard/build-leaderboard";
import { songMilestones } from "@/lib/dashboard/milestones";
import {
  getCatalogAdditions,
  getContributors,
  getSongOfTheDay,
  getUserHistory,
  getUserStats,
  getUserTopArtists,
  getUserYearlyActivity,
} from "@/lib/queries/dashboard";
import { getListsOverview } from "@/lib/queries/lists";
import { countLabel } from "@/lib/text/count-label";
import { formatDate } from "@/lib/text/format-date";
import { formatPercent } from "@/lib/text/format-percent";
import { ActivityCard } from "./activity-card";
import { LeaderboardCard } from "./leaderboard-card";
import { MilestonesCard } from "./milestones-card";
import { RecentAdditionsCard } from "./recent-additions-card";
import { SongHistoryCard } from "./song-history-card";
import { SongOfTheDayCard } from "./song-of-the-day-card";
import { StatCard } from "./stat-card";
import { TopArtistsCard } from "./top-artists-card";

/** How many of the user's songs the history card loads. */
const HISTORY_SIZE = 100;
const TOP_ARTIST_COUNT = 5;
const RECENT_ADDITION_COUNT = 5;

interface SectionProps {
  userId: string;
  now: Date;
}

async function ActivitySummaryLine({ userId }: Pick<SectionProps, "userId">) {
  const stats = await getUserStats(userId);

  if (!stats.firstAddedAt || !stats.lastAddedAt) {
    return (
      <p className="text-sm text-muted-foreground">
        Add your first song to start building your history.
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Contributing since {formatDate(stats.firstAddedAt)} · last added{" "}
      {formatDate(stats.lastAddedAt)}
    </p>
  );
}

async function StatsSection({ userId }: Pick<SectionProps, "userId">) {
  const [stats, contributors] = await Promise.all([
    getUserStats(userId),
    getContributors(),
  ]);
  const { you, totalContributors } = buildLeaderboard(contributors, userId);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        icon={Music}
        label="Songs added"
        value={stats.songsAdded.toLocaleString("en-US")}
        caption={`${formatPercent(stats.songsAdded, stats.catalogSongs)} of the catalog`}
      />
      <StatCard
        icon={Mic2}
        label="Artists"
        value={stats.artistsCovered.toLocaleString("en-US")}
        caption="different artists in your songs"
      />
      <StatCard
        icon={ListMusic}
        label="List additions"
        value={stats.listAdditions.toLocaleString("en-US")}
        caption={`across ${countLabel(stats.listsContributedTo, "list")}`}
      />
      <StatCard
        icon={Trophy}
        label="Contributor rank"
        value={you ? `#${you.rank}` : "–"}
        caption={`of ${countLabel(totalContributors, "contributor")}`}
      />
    </div>
  );
}

async function ListsSection({ userId, now }: SectionProps) {
  const lists = await getListsOverview(userId);

  return (
    <section aria-labelledby="lists-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id="lists-heading" className="text-lg font-semibold">
          Browse lists
        </h2>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/lists" />}
        >
          View all lists
          <ArrowRight />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} now={now} />
        ))}
      </div>
    </section>
  );
}

async function HistorySection({ userId, now }: SectionProps) {
  const [entries, stats] = await Promise.all([
    getUserHistory(userId, HISTORY_SIZE),
    getUserStats(userId),
  ]);

  return (
    <SongHistoryCard entries={entries} total={stats.songsAdded} now={now} />
  );
}

async function ActivitySection({ userId }: Pick<SectionProps, "userId">) {
  const buckets = bucketByYear(await getUserYearlyActivity(userId));

  return (
    <ActivityCard buckets={buckets} summary={summarizeActivity(buckets)} />
  );
}

async function TopArtistsSection({ userId }: Pick<SectionProps, "userId">) {
  return (
    <TopArtistsCard
      artists={await getUserTopArtists(userId, TOP_ARTIST_COUNT)}
    />
  );
}

async function MilestonesSection({ userId }: Pick<SectionProps, "userId">) {
  const { songsAdded } = await getUserStats(userId);

  return (
    <MilestonesCard
      songCount={songsAdded}
      progress={songMilestones(songsAdded)}
    />
  );
}

async function SongOfTheDaySection({ now }: Pick<SectionProps, "now">) {
  return <SongOfTheDayCard featured={await getSongOfTheDay(now)} />;
}

async function LeaderboardSection({ userId }: Pick<SectionProps, "userId">) {
  return (
    <LeaderboardCard
      leaderboard={buildLeaderboard(await getContributors(), userId)}
    />
  );
}

async function RecentAdditionsSection() {
  return (
    <RecentAdditionsCard
      additions={await getCatalogAdditions(RECENT_ADDITION_COUNT)}
    />
  );
}

export {
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
};
