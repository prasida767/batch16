import nextDynamic from "next/dynamic";
import { ErrorState, PageHeader, SetupState } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { getRivalriesBoard } from "@/lib/rivalries";

const RivalriesBoardView = nextDynamic(
  () =>
    import("@/components/rivalries/rivalries-board").then(
      (m) => m.RivalriesBoardView,
    ),
  {
    loading: () => (
      <div className="h-96 animate-pulse rounded-2xl bg-muted/40" aria-hidden />
    ),
  },
);

export const revalidate = 120;

export default async function RivalriesPage() {
  const result = await getRivalriesBoard();

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
      <RivalriesBoardView board={result.board} />
    </div>
  );
}
