import type { FplManagerHistory } from "@/lib/fpl";
import type { WeeklyGameweek } from "@/lib/league/types";
import {
  craftCliffhanger,
  craftEpisodeTitle,
  pickEpisodeTheme,
} from "@/lib/documentary/titles";

export type GeneratedEpisodeBody = {
  title: string;
  biggestShock: string;
  worstDecision: string;
  dramaticOvertake: string;
  cliffhanger: string;
};

type RankedRow = {
  entryId: number;
  name: string;
  points: number;
  leagueRank: number;
  climb: number;
  transferCost: number;
  pointsOnBench: number;
};

function buildRanked(
  week: WeeklyGameweek,
  previous: WeeklyGameweek | null,
  histories: Map<number, FplManagerHistory>,
): RankedRow[] {
  const prevRank = new Map(
    (previous?.rows ?? []).map((r) => [r.entryId, r.rank]),
  );

  return week.rows.map((row) => {
    const hist = histories.get(row.entryId)?.current ?? [];
    const event = hist.find((h) => h.event === week.gameweek);
    const priorLeague = prevRank.get(row.entryId);
    const climb =
      priorLeague != null ? priorLeague - row.rank : 0;

    return {
      entryId: row.entryId,
      name: row.name,
      points: row.points,
      leagueRank: row.rank,
      climb,
      transferCost: event?.event_transfers_cost ?? 0,
      pointsOnBench: event?.points_on_bench ?? 0,
    };
  });
}

export function narrateWeeklyEpisode(args: {
  week: WeeklyGameweek;
  previous: WeeklyGameweek | null;
  histories: Map<number, FplManagerHistory>;
  nextGameweek: number | null;
  seasonComplete: boolean;
  tableLeaderName: string | null;
}): GeneratedEpisodeBody {
  const { week, previous, histories } = args;
  const rows = buildRanked(week, previous, histories);
  const avg =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.points, 0) / rows.length
      : 0;

  const winner = rows[0] ?? null;
  const worst = [...rows].sort((a, b) => a.points - b.points)[0] ?? null;
  const second = rows[1] ?? null;
  const overtake = [...rows].sort((a, b) => b.climb - a.climb)[0] ?? null;
  const benchSinner =
    [...rows].sort((a, b) => b.pointsOnBench - a.pointsOnBench)[0] ?? null;
  const transferPain =
    [...rows]
      .filter((r) => r.transferCost > 0)
      .sort((a, b) => a.points - b.points || b.transferCost - a.transferCost)[0] ??
    null;

  const shockMargin = winner && second ? winner.points - second.points : 0;
  const theme = pickEpisodeTheme({
    winnerPoints: winner?.points ?? 0,
    worstPoints: worst?.points ?? 0,
    avgPoints: avg,
    overtakePlaces: overtake?.climb ?? 0,
    shockMargin,
  });

  const title = craftEpisodeTitle({
    gameweek: week.gameweek,
    winnerName: winner?.name ?? null,
    winnerPoints: winner?.points ?? 0,
    worstName: worst?.name ?? null,
    worstPoints: worst?.points ?? 0,
    avgPoints: avg,
    overtakePlaces: overtake?.climb ?? 0,
    shockMargin,
    theme,
  });

  let biggestShock: string;
  if (winner && shockMargin >= 12 && second) {
    biggestShock = `${winner.name} detonated the week with ${winner.points} pts — a ${shockMargin}-point gulf over ${second.name}. The table felt the aftershock.`;
  } else if (winner && winner.points - avg >= 15) {
    biggestShock = `${winner.name} left the field for dead: ${winner.points} pts against a league average of ${avg.toFixed(0)}. Differentials, destiny, or both.`;
  } else if (worst && avg - worst.points >= 15) {
    biggestShock = `The floor opened under ${worst.name}. ${worst.points} pts while the room averaged ${avg.toFixed(0)} — a silence that echoed all week.`;
  } else if (winner) {
    biggestShock = `${winner.name} took the week on ${winner.points} pts. Not a massacre — a slow, clinical heist.`;
  } else {
    biggestShock = `Gameweek ${week.gameweek} left more questions than answers.`;
  }

  let worstDecision: string;
  if (transferPain && transferPain.transferCost >= 4 && transferPain.points <= avg) {
    worstDecision = `${transferPain.name} paid ${transferPain.transferCost} for the privilege of ${transferPain.points} pts. The hits hurt twice.`;
  } else if (benchSinner && benchSinner.pointsOnBench >= 12) {
    worstDecision = `${benchSinner.name} left ${benchSinner.pointsOnBench} pts on the pine. The bench celebrated; the starting XI did not.`;
  } else if (worst) {
    worstDecision = `${worst.name} authored the week's cautionary tale — ${worst.points} pts, and a captaincy decision that will live in Discord forever.`;
  } else {
    worstDecision = `Someone pressed the wrong button. History declined to name them — until now.`;
  }

  let dramaticOvertake: string;
  if (overtake && overtake.climb >= 2) {
    dramaticOvertake = `${overtake.name} surged ${overtake.climb} place${overtake.climb === 1 ? "" : "s"} up the league on ${overtake.points} pts — the kind of climb that rewrites rivalries.`;
  } else if (overtake && overtake.climb === 1) {
    dramaticOvertake = `${overtake.name} edged one place higher. Quiet. Dangerous. Unforgettable to the manager they passed.`;
  } else if (winner) {
    dramaticOvertake = `The standings barely blinked — but ${winner.name}'s ${winner.points} kept pressure on everyone above the drop zone.`;
  } else {
    dramaticOvertake = `No dramatic leap this week. The tension simply tightened.`;
  }

  const cliffhanger = craftCliffhanger({
    nextGameweek: args.nextGameweek,
    leaderName: args.tableLeaderName,
    seasonComplete: args.seasonComplete,
  });

  return {
    title,
    biggestShock,
    worstDecision,
    dramaticOvertake,
    cliffhanger,
  };
}

export function narrateSeasonFinale(args: {
  weeks: WeeklyGameweek[];
  championName: string | null;
  mostWinsName: string | null;
  mostWinsCount: number;
  bestQuotes: Array<{ body: string; managerName: string; gameweek: number }>;
  rivalryLine: string | null;
}): { title: string; body: GeneratedEpisodeBody; finaleSummary: string } {
  const played = args.weeks.filter((w) => w.rows.some((r) => r.points > 0));
  const title = "Season Finale: The Story We Lived";

  const biggestShock = args.championName
    ? `When the dust settled, ${args.championName} stood alone atop Batch 16. Crowns are heavy; this one was earned week by week.`
    : `The final table refused a simple ending. Contenders came, went, and came again.`;

  const worstDecision = args.mostWinsName
    ? `Across ${played.length} gameweeks, ${args.mostWinsName} claimed ${args.mostWinsCount} weekly crown${args.mostWinsCount === 1 ? "" : "s"} — proof that one purple patch can haunt a season.`
    : `The weekly crowns were shared like stolen trophies. No dynasty. Only scars.`;

  const dramaticOvertake = args.rivalryLine
    ? args.rivalryLine
    : `Rivalries wrote themselves in the gaps between ranks — every climb an accusation, every drop a dare.`;

  const quoteLines =
    args.bestQuotes.length > 0
      ? args.bestQuotes
          .slice(0, 3)
          .map(
            (q) =>
              `“${q.body}” — ${q.managerName} (GW${q.gameweek})`,
          )
          .join(" · ")
      : "The Dressing Room kept its best lines for the archive.";

  const finaleSummary = [
    `Batch 16's season closed after ${played.length} episodes of chaos.`,
    biggestShock,
    dramaticOvertake,
    `Best of Banter: ${quoteLines}`,
  ].join(" ");

  return {
    title,
    body: {
      title,
      biggestShock,
      worstDecision,
      dramaticOvertake,
      cliffhanger:
        "Until next season — same league, new scars, louder banter.",
    },
    finaleSummary,
  };
}
