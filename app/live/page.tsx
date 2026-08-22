import {
  ErrorState,
  PageHeader,
  SetupState,
} from "@/components/league/shared";
import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import { MatchCentre } from "@/components/league/match-centre";
import { logAppError } from "@/lib/errors/log";
import { raceTimeout } from "@/lib/async/timeout";
import { getVerifiedManager } from "@/lib/auth/session";
import { getLiveStandingsPayload } from "@/lib/league";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export default async function LiveMatchCentrePage() {
  let result: Awaited<ReturnType<typeof getLiveStandingsPayload>>;
  try {
    result = await raceTimeout(
      getLiveStandingsPayload(),
      9_000,
      {
        kind: "error" as const,
        message: "Live standings are taking too long. Try refreshing.",
      },
      "getLiveStandingsPayload",
    );
  } catch (error) {
    logAppError("live", error);
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Live"
          title="Live Match Centre"
          description="Watch live standings, GW points, and top scorers on match days."
        />
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Couldn't load live standings. Try refreshing."
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
    <FeatureErrorBoundary feature="live" variant="page">
      <MatchCentre
        initial={result.data}
        leagueName={result.data.leagueName}
        highlightEntryId={me?.fplEntryId ?? null}
      />
    </FeatureErrorBoundary>
  );
}
