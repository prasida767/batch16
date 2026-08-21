import {
  ErrorState,
  PageHeader,
  SetupState,
} from "@/components/league/shared";
import { MatchCentre } from "@/components/league/match-centre";
import { getVerifiedManager } from "@/lib/auth/session";
import { getLiveStandingsPayload } from "@/lib/league";

export const revalidate = 30;

export default async function LiveMatchCentrePage() {
  const [result, me] = await Promise.all([
    getLiveStandingsPayload(),
    getVerifiedManager().catch(() => null),
  ]);

  if (result.kind === "no_league") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Live"
          title="Live Match Centre"
          description="Watch live standings, GW points, and top scorers on match days."
        />
        <SetupState
          title="Add your FPL league ID"
          body="Set FPL_LEAGUE_ID in .env.local to load live scores from FPL."
        />
      </div>
    );
  }

  if (result.kind === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Live"
          title="Live Match Centre"
          description="Watch live standings, GW points, and top scorers on match days."
        />
        <ErrorState message={result.message} />
      </div>
    );
  }

  return (
    <MatchCentre
      initial={result.data}
      leagueName={result.data.leagueName}
      highlightEntryId={me?.fplEntryId ?? null}
    />
  );
}
