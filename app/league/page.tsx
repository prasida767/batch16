import {
  ErrorState,
  PageHeader,
  SetupState,
} from "@/components/league/shared";
import { LeagueHub } from "@/components/league/league-hub";
import { FeatureErrorBoundary } from "@/components/error-boundary";
import { getVerifiedManager } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/league";
import { getUpcomingFixtures } from "@/lib/fpl";

export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  const [board, fixtures] = await Promise.all([
    getDashboardData().catch((error) => {
      console.error("[league] Dashboard failed", error);
      return {
        kind: "error" as const,
        message:
          error instanceof Error
            ? error.message
            : "Couldn't load the league right now.",
      };
    }),
    getUpcomingFixtures().catch(() => []),
  ]);
  const result = board;

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

  const me = await getVerifiedManager().catch(() => null);

  return (
    <FeatureErrorBoundary name="League">
      <LeagueHub
        initial={data}
        currency={data.prize.currency}
        lastWinnerHint={lastWinnerHint}
        initialFixtures={fixtures}
        featuredEpisode={null}
        highlightEntryId={me?.fplEntryId ?? null}
      />
    </FeatureErrorBoundary>
  );
}
