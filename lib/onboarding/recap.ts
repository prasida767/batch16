import "server-only";

import { getPastSeasonsData } from "@/lib/history/queries";
import { prizeTypeLabel } from "@/lib/history/queries";
import type { PastSeasonDetail } from "@/lib/history/queries";
import type { SeasonRecapPayload } from "@/lib/onboarding/types";

function nextSeasonLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{2})$/);
  if (!m) return "This season";
  const start = Number(m[1]) + 1;
  const endTwo = String((Number(m[2]) + 1) % 100).padStart(2, "0");
  return `${start}-${endTwo}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function pickPrize(
  detail: PastSeasonDetail,
  type: string,
) {
  return detail.prizes.find((p) => p.prizeType === type) ?? null;
}

function roastViewer(args: {
  name: string;
  weeklyWins: number;
  prizes: string[];
  isChampion: boolean;
  isRunnerUp: boolean;
}): { headline: string; roast: string } {
  const you = firstName(args.name);
  if (args.isChampion) {
    return {
      headline: `${you} wore the crown.`,
      roast: "Defending it is the hard part. The league remembers — and they're hungry.",
    };
  }
  if (args.isRunnerUp) {
    return {
      headline: `${you} finished second. Painfully close.`,
      roast: "Almost royalty. This season: less 'nearly' and more 'obviously'.",
    };
  }
  if (args.weeklyWins >= 3) {
    return {
      headline: `${you} won ${args.weeklyWins} gameweeks.`,
      roast: "Hot streaks don't pay the overall. Consistency does. Good luck proving it.",
    };
  }
  if (args.weeklyWins === 1) {
    return {
      headline: `${you} stole one golden week.`,
      roast: "One trophy toast. The rest of the season? Character development.",
    };
  }
  if (args.prizes.length > 0) {
    return {
      headline: `${you} left with: ${args.prizes.join(", ")}.`,
      roast: "Not nothing. Not enough. Perfect fuel for a rematch.",
    };
  }
  if (args.weeklyWins === 0 && args.prizes.length === 0) {
    return {
      headline: `${you} survived the season.`,
      roast: "No weekly glory. No silverware. Main-character energy for a comeback arc.",
    };
  }
  return {
    headline: `${you} was in the mix.`,
    roast: "The archive has your name. Make this season louder.",
  };
}

/**
 * Build a cinematic recap of the latest archived season for onboarding.
 */
export async function getSeasonRecapPayload(args: {
  managerId: number;
  displayName: string;
}): Promise<SeasonRecapPayload | null> {
  const result = await getPastSeasonsData();
  if (result.kind !== "ok" || !result.data.selected) return null;

  const detail = result.data.selected;
  const season = detail.season;
  const champion = pickPrize(detail, "overall_1st");
  const runnerUp = pickPrize(detail, "overall_2nd");
  const highestGwPrize = pickPrize(detail, "highest_gw");

  const champWins =
    champion != null
      ? (detail.winCounts.find((w) => w.managerId === champion.managerId)
          ?.wins ?? 0)
      : 0;
  const runnerWins =
    runnerUp != null
      ? (detail.winCounts.find((w) => w.managerId === runnerUp.managerId)
          ?.wins ?? 0)
      : 0;

  let winningMarginLine =
    "One name on the trophy. Everyone else writing excuses.";
  if (champion && runnerUp) {
    const gap = champWins - runnerWins;
    if (gap > 0) {
      winningMarginLine = `${firstName(champion.managerName)} took ${champWins} weekly crowns to ${firstName(runnerUp.managerName)}'s ${runnerWins} — a ${gap}-win gap that felt personal.`;
    } else {
      winningMarginLine = `${firstName(champion.managerName)} edged ${firstName(runnerUp.managerName)} when it mattered. Weekly form lied. The table didn't.`;
    }
  } else if (champion) {
    winningMarginLine = `${firstName(champion.managerName)} ran away with it. The rest of Batch 16 filed a complaint with the universe.`;
  }

  const peakWeekly = [...detail.weeklyWinners]
    .filter((w) => w.points != null)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];

  const highestGw = highestGwPrize
    ? {
        managerName: highestGwPrize.managerName,
        gameweek: null as number | null,
        points: null as number | null,
        line: `${firstName(highestGwPrize.managerName)} detonated the highest single GW of the season. Neighbours reported hearing celebration and regret.`,
      }
    : peakWeekly
      ? {
          managerName: peakWeekly.managerName,
          gameweek: peakWeekly.gameweek,
          points: peakWeekly.points,
          line: `GW${peakWeekly.gameweek}: ${firstName(peakWeekly.managerName)} hit ${peakWeekly.points} — the kind of score that ruins group chats.`,
        }
      : null;

  const topWeeklyHunter = detail.winCounts[0] ?? null;
  const nearlyMan =
    topWeeklyHunter &&
    champion &&
    topWeeklyHunter.managerId !== champion.managerId
      ? topWeeklyHunter
      : detail.winCounts[1] ?? null;

  const consolation = pickPrize(detail, "consolation");

  const moments = [
    nearlyMan
      ? {
          id: "overtake",
          eyebrow: "Biggest near-miss",
          headline: `${firstName(nearlyMan.managerName)} owned the weeks.`,
          body: `${nearlyMan.wins} weekly win${nearlyMan.wins === 1 ? "" : "s"} — and still not the champion. Form is temporary. The table is forever (and rude).`,
          tone: "ember" as const,
        }
      : null,
    consolation
      ? {
          id: "collapse",
          eyebrow: "The unlucky plot twist",
          headline: `${firstName(consolation.managerName)} took Consolation.`,
          body: "The prize you never want to win. A reminder that one bad month can rewrite a season.",
          tone: "poison" as const,
        }
      : null,
    detail.winCounts.length >= 3
      ? {
          id: "chaos",
          eyebrow: "The chaos tax",
          headline: "Weekly winners everywhere.",
          body: `${detail.weeklyWinners.length} gameweeks, ${detail.winCounts.length} different names tasting glory. Batch 16 doesn't do boring.`,
          tone: "ice" as const,
        }
      : null,
  ].filter(Boolean) as SeasonRecapPayload["moments"];

  const viewerWins =
    detail.winCounts.find((w) => w.managerId === args.managerId)?.wins ?? 0;
  const viewerPrizes = detail.prizes
    .filter((p) => p.managerId === args.managerId)
    .map((p) => prizeTypeLabel(p.prizeType));
  const played =
    viewerWins > 0 ||
    viewerPrizes.length > 0 ||
    detail.weeklyWinners.some((w) => w.managerId === args.managerId) ||
    // If they're in the league now, treat as archive participant when name appears in winCounts/prizes only
    detail.prizes.some((p) => p.managerId === args.managerId);

  // Broader: any appearance in weekly winners OR prizes
  const appeared =
    detail.weeklyWinners.some((w) => w.managerId === args.managerId) ||
    detail.prizes.some((p) => p.managerId === args.managerId);

  const isChampion = champion?.managerId === args.managerId;
  const isRunnerUp = runnerUp?.managerId === args.managerId;
  const story = roastViewer({
    name: args.displayName,
    weeklyWins: viewerWins,
    prizes: viewerPrizes,
    isChampion,
    isRunnerUp,
  });

  const currentSeasonLabel = nextSeasonLabel(season.label);

  return {
    seasonLabel: season.label,
    seasonName: season.name,
    startYear: season.startYear,
    currentSeasonLabel,
    viewerName: args.displayName,
    viewerManagerId: args.managerId,
    champion: champion
      ? { managerId: champion.managerId, name: champion.managerName }
      : null,
    runnerUp: runnerUp
      ? { managerId: runnerUp.managerId, name: runnerUp.managerName }
      : null,
    winningMarginLine,
    highestGw,
    moments,
    viewerStory: {
      played: appeared || played,
      weeklyWins: viewerWins,
      prizes: viewerPrizes,
      headline: appeared
        ? story.headline
        : `${firstName(args.displayName)} — new blood.`,
      roast: appeared
        ? story.roast
        : "No scars from last season. Lucky you. The veterans will try to change that.",
    },
    welcomeLine: `Welcome to Batch 16 · ${currentSeasonLabel}`,
    cliffhanger:
      "New gameweeks. Old grudges. Same dressing room. Try not to finish in the documentary as comic relief.",
  };
}
