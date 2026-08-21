import {
  ErrorState,
  PageHeader,
  SetupState,
} from "@/components/league/shared";
import { LeagueHub } from "@/components/league/league-hub";
import { getVerifiedManager } from "@/lib/auth/session";
import { getActingManagerId } from "@/lib/challenges";
import { getLatestDocumentaryEpisode } from "@/lib/documentary";
import { getDashboardData } from "@/lib/league";
import { getUpcomingFixtures } from "@/lib/fpl";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

async function loadFeaturedEpisode() {
  if (!isDatabaseConfigured()) return null;
  try {
    const viewerId = await getActingManagerId();
    return await getLatestDocumentaryEpisode(viewerId);
  } catch {
    return null;
  }
}

export default async function LeaguePage() {
  const [result, me, fixtures, latestEpisode] = await Promise.all([
    getDashboardData(),
    getVerifiedManager().catch(() => null),
    getUpcomingFixtures().catch(() => []),
    loadFeaturedEpisode(),
  ]);

  if (result.kind === "no_league") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="League"
          title="League table"
          description="Standings, weekly wins, and prize balances appear once the league ID is set."
        />
        <SetupState
          title="Add your FPL league ID"
          body="Set FPL_LEAGUE_ID in .env.local to the classic league ID from fantasy.premierleague.com, then restart the dev server."
        />
      </div>
    );
  }

  if (result.kind === "error") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="League" title="League table" />
        <ErrorState message={result.message} />
      </div>
    );
  }

  const { data } = result;
  const lastWinnerHint = data.lastWinner
    ? `Last weekly · ${data.lastWinner.winnerNames.join(", ")} (${data.lastWinner.winnerPoints} pts)`
    : (data.meta.currentEventName ?? "Waiting for the season");

  return (
    <LeagueHub
      initial={data}
      currency={data.prize.currency}
      lastWinnerHint={lastWinnerHint}
      initialFixtures={fixtures}
      featuredEpisode={latestEpisode}
      highlightEntryId={me?.fplEntryId ?? null}
    />
  );
}
