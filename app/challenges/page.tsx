import nextDynamic from "next/dynamic";
import { PageHeader, SetupState } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { getChallengesPageData } from "@/app/challenges/actions";

const ChallengesBoard = nextDynamic(
  () =>
    import("@/components/challenges/challenges-board").then(
      (m) => m.ChallengesBoard,
    ),
  {
    loading: () => (
      <div className="h-72 animate-pulse rounded-2xl bg-muted/40" aria-hidden />
    ),
  },
);

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const data = await getChallengesPageData();

  if (data.kind === "no_db") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Match day"
          title="Baaji"
          description="Friendly wagers between managers — stakes are tracked only."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL and run migrations before using Baaji."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-900/20 bg-[radial-gradient(ellipse_at_50%_0%,#1a3d2a_0%,#0c1812_70%)] px-5 py-8 text-white shadow-card sm:px-8 sm:py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0, transparent 14%, rgba(255,255,255,0.08) 14%, rgba(255,255,255,0.08) 28%)",
            }}
          />
          <div className="relative space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-amber-200/80 uppercase">
              Match day · Side bets
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
              Baaji Stadium
            </h1>
            <p className="max-w-xl text-sm text-emerald-100/70 sm:text-[0.95rem]">
              Every wager is a fixture. Crowds, kick-offs, and full-time drama —
              stakes tracked in NPR, winners declared by admin.
            </p>
          </div>
        </div>
      </FadeIn>
      <FadeIn delay={0.04}>
        <ChallengesBoard
          actingManagerId={data.actingManagerId}
          actingName={data.acting?.displayName ?? null}
          signedIn
          managers={data.managers}
          currentGameweek={data.currentGameweek}
          awaitingYou={data.awaitingYou}
          active={data.active}
          season={data.season}
        />
      </FadeIn>
    </div>
  );
}
