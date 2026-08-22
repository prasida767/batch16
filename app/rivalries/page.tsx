import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import { RivalriesBoardView } from "@/components/rivalries/rivalries-board";
import { ErrorState, PageHeader, SetupState } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { logAppError } from "@/lib/errors/log";
import { getRivalriesBoard } from "@/lib/rivalries";

export const dynamic = "force-dynamic";

export default async function RivalriesPage() {
  let result: Awaited<ReturnType<typeof getRivalriesBoard>>;
  try {
    result = await getRivalriesBoard();
  } catch (error) {
    logAppError("rivalries", error);
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Drama" title="Rivalries" />
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Couldn't load rivalries. Try refreshing."
          }
        />
      </div>
    );
  }

  if (result.kind === "no_league") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Drama" title="Rivalries" />
        <SetupState
          title="Add your FPL league ID"
          body="Set FPL_LEAGUE_ID so we can score every head-to-head."
        />
      </div>
    );
  }

  if (result.kind === "error") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Drama" title="Rivalries" />
        <ErrorState message={result.message} />
      </div>
    );
  }

  if (result.kind === "empty") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Drama"
          title="Rivalries"
          description="Nemeses, lucky charms, and toxic scrapbooks."
        />
        <SetupState
          title="Waiting on gameweeks"
          body={result.message}
          href="/league"
          cta="Back to league"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          eyebrow="Drama"
          title="Rivalries"
          description="Who owns who across finished gameweeks — nemeses, lucky charms, and the league’s messiest feuds."
        />
      </FadeIn>
      <FeatureErrorBoundary feature="rivalries" variant="page">
        <RivalriesBoardView board={result.board} />
      </FeatureErrorBoundary>
    </div>
  );
}
