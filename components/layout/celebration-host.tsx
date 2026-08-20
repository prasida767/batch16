"use client";

import dynamic from "next/dynamic";
import type { GwWinnerCelebration } from "@/lib/league/celebration";

const GwWinnerCelebrationOverlay = dynamic(
  () =>
    import("@/components/layout/gw-winner-celebration").then(
      (m) => m.GwWinnerCelebration,
    ),
  { ssr: false },
);

export function CelebrationHost({
  celebration,
}: {
  celebration: GwWinnerCelebration;
}) {
  return <GwWinnerCelebrationOverlay celebration={celebration} />;
}
