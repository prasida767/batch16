import {
  ErrorState,
  PageHeader,
  SetupState,
} from "@/components/league/shared";
import { LeagueHub } from "@/components/league/league-hub";
import { FeatureErrorBoundary } from "@/components/error-boundary";
import { getVerifiedManager } from "@/lib/auth/session";
import { getLatestDocumentaryEpisode } from "@/lib/documentary";
import { getDashboardData } from "@/lib/league";
import { getUpcomingFixtures } from "@/lib/fpl";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  let result: Awaited<ReturnType<typeof getDashboardData>>;
  try {
    result = await getDashboardData();
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="League" title="League table" />
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Couldn't load the league right now."
          }
        />
      </div>
    );
  }
  const me = await getVerifiedManager().catch(() => null);

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

  const fixtures = await getUpcomingFixtures().catch(() => []);

  let latestEpisode = null;
  if (isDatabaseConfigured()) {
    try {
      latestEpisode = await getLatestDocumentaryEpisode(me?.managerId ?? null);
    } catch {
      latestEpisode = null;
    }
  }

  return (
    <FeatureErrorBoundary name="League">
      <LeagueHub
        initial={data}
        currency={data.prize.currency}
        lastWinnerHint={lastWinnerHint}
        initialFixtures={fixtures}
        featuredEpisode={latestEpisode}
        highlightEntryId={me?.fplEntryId ?? null}
      />
    </FeatureErrorBoundary>
  );
}
