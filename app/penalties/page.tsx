import { PageHeader, SetupState } from "@/components/league/shared";

export const dynamic = "force-dynamic";

export default function PenaltiesRetiredPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archive"
        title="Penalty Shootout"
        description="This mini-game is no longer part of Batch 16."
      />
      <SetupState
        title="Penalty Shootout is retired"
        body="Solo and challenge shootouts have been taken down so the league stays focused on FPL. Side bets live on Baaji; banter is in the Dressing Room."
        href="/challenges"
        cta="Open Baaji"
      />
    </div>
  );
}
