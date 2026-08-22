import {
  ErrorState,
  PageHeader,
  SetupState,
} from "@/components/league/shared";
import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import { LeagueHub } from "@/components/league/league-hub";
import { logAppError } from "@/lib/errors/log";
import { raceTimeout } from "@/lib/async/timeout";
import { getVerifiedManager } from "@/lib/auth/session";
import { getActingManagerId } from "@/lib/challenges";
import { getLatestDocumentaryEpisode } from "@/lib/documentary";
import { getDashboardData } from "@/lib/league";
import { getUpcomingFixtures } from "@/lib/fpl";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export const maxDuration = 30;

export default async function LeaguePage() {
  let result: Awaited<ReturnType<typeof getDashboardData>>;
  try {
    result = await raceTimeout(
      getDashboardData(),
      9_000,
      {
        kind: "error" as const,
        message: "League is taking too long to load. Try refreshing.",
      },
      "getDashboardData",
    );
  } catch (error) {
    logAppError("league", error);
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="League" title="League table" />
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Couldn't load the league. Try refreshing."
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
      const viewerId = await getActingManagerId();
      latestEpisode = await getLatestDocumentaryEpisode(viewerId);
    } catch (error) {
      logAppError("documentary", error, { source: "league-teaser" });
      latestEpisode = null;
    }
  }

  return (
    <FeatureErrorBoundary feature="league" variant="page">
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
