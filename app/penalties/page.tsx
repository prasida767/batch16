import Link from "next/link";
import { PageHeader } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";

/**
 * Penalties are archived (see `archive/penalties/`) until we move off the
 * free-tier Supabase limits. This stub keeps old /penalties links safe.
 */
export default function PenaltiesPausedPage() {
  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          eyebrow="Mini-game"
          title="Penalty Shootout"
          description="Temporarily paused while we keep the league fast on the free plan."
        />
      </FadeIn>
      <div className="rounded-2xl border border-border/70 bg-muted/30 px-5 py-8 sm:px-8">
        <p className="max-w-xl text-sm text-muted-foreground">
          The shootout game (solo + challenges + live presence) is parked in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            archive/penalties
          </code>{" "}
          and will come back when we upgrade hosting. Everything else — league,
          Baaji, Dressing Room, documentary — stays live.
        </p>
        <Button render={<Link href="/league" />} className="mt-6">
          Back to League
        </Button>
      </div>
    </div>
  );
}
