import type { WeeklyGameweek } from "@/lib/league/types";

export type RivalryManager = {
  entryId: number;
  displayName: string;
  supportedTeamId: number | null;
  supportedTeamCode: number | null;
  avatarVariant: number;
};

export type PairRecord = {
  aId: number;
  bId: number;
  aWins: number;
  bWins: number;
  draws: number;
  /** Sum of (aPoints - bPoints) across compared GWs. */
  netPointDiff: number;
  /** Absolute point swing magnitude. */
  avgAbsDiff: number;
  games: number;
  /** Current streak: positive = A ahead streak, negative = B. */
  aStreak: number;
  bStreak: number;
  aMaxWinStreak: number;
  bMaxWinStreak: number;
  /** Times A overtook B (was behind in rank, then ahead). */
  aOvertakes: number;
  bOvertakes: number;
  /** Rank diff timeline for A vs B: positive means A ranks better (lower rank number). */
  timeline: Array<{
    gameweek: number;
    aRank: number;
    bRank: number;
    /** bRank - aRank (positive = A finishing higher). */
    rankEdge: number;
    aPoints: number;
    bPoints: number;
  }>;
};

export type NamedRivalry = {
  key: string;
  title: string;
  subtitle: string;
  a: RivalryManager;
  b: RivalryManager;
  record: PairRecord;
  /** 0–1 how one-sided toward a (0.5 = even). */
  dominanceTowardA: number;
};

export type ManagerRivalryProfile = {
  entryId: number;
  nemesis: NamedRivalry | null;
  luckyCharm: NamedRivalry | null;
};

export type RivalriesBoard = {
  managers: RivalryManager[];
  /** Heatmap cell: row dominates column. null on diagonal. */
  heatmap: Array<Array<number | null>>;
  pairs: NamedRivalry[];
  toxic: NamedRivalry | null;
  comeback: NamedRivalry | null;
  /** entryId → profile (plain object for RSC serialization). */
  profiles: Record<number, ManagerRivalryProfile>;
};

function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function minOf(values: number[]): number | null {
  if (values.length === 0) return null;
  let min = values[0]!;
  for (const value of values) {
    if (value < min) min = value;
  }
  return min;
}

function maxOf(values: number[]): number | null {
  if (values.length === 0) return null;
  let max = values[0]!;
  for (const value of values) {
    if (value > max) max = value;
  }
  return max;
}

function dominanceTowardA(rec: PairRecord): number {
  const decided = rec.aWins + rec.bWins;
  if (decided === 0) return 0.5;
  return rec.aWins / decided;
}

function dramaticTitle(rec: PairRecord, aName: string, bName: string): {
  title: string;
  subtitle: string;
} {
  const decided = rec.aWins + rec.bWins;
  const dom = dominanceTowardA(rec);
  const leader = dom >= 0.5 ? aName : bName;
  const trailing = dom >= 0.5 ? bName : aName;
  const leadWins = Math.max(rec.aWins, rec.bWins);
  const trailWins = Math.min(rec.aWins, rec.bWins);

  if (decided >= 6 && Math.abs(dom - 0.5) < 0.12) {
    return {
      title: "Blood Feud",
      subtitle: `${aName} and ${bName} can't stop trading blows (${rec.aWins}–${rec.bWins})`,
    };
  }
  if (dom >= 0.75 || dom <= 0.25) {
    return {
      title: "Total Domination",
      subtitle: `${leader} has owned ${trailing} all season (${leadWins}–${trailWins})`,
    };
  }
  if (Math.max(rec.aMaxWinStreak, rec.bMaxWinStreak) >= 4) {
    const streaker =
      rec.aMaxWinStreak >= rec.bMaxWinStreak ? aName : bName;
    return {
      title: "Hot Streak Nightmare",
      subtitle: `${streaker} once ran a ${Math.max(rec.aMaxWinStreak, rec.bMaxWinStreak)}-week heater`,
    };
  }
  if (rec.aOvertakes + rec.bOvertakes >= 4) {
    return {
      title: "Yo-Yo Rivalry",
      subtitle: `${rec.aOvertakes + rec.bOvertakes} overtakes — nobody stays on top`,
    };
  }
  return {
    title: "Season-Long Scrap",
    subtitle: `${aName} ${rec.aWins}–${rec.bWins} ${bName} · net ${rec.netPointDiff >= 0 ? "+" : ""}${Math.round(rec.netPointDiff)} pts`,
  };
}

/**
 * Build pairwise H2H records from finished gameweeks.
 */
export function computePairRecords(
  weeks: WeeklyGameweek[],
): Map<string, PairRecord> {
  const finished = weeks
    .filter((w) => w.finished && w.rows.length >= 2)
    .sort((a, b) => a.gameweek - b.gameweek);

  const pairs = new Map<string, PairRecord>();

  function getOrCreate(aId: number, bId: number): PairRecord {
    const key = pairKey(aId, bId);
    let rec = pairs.get(key);
    if (!rec) {
      const [lo, hi] = aId < bId ? [aId, bId] : [bId, aId];
      rec = {
        aId: lo,
        bId: hi,
        aWins: 0,
        bWins: 0,
        draws: 0,
        netPointDiff: 0,
        avgAbsDiff: 0,
        games: 0,
        aStreak: 0,
        bStreak: 0,
        aMaxWinStreak: 0,
        bMaxWinStreak: 0,
        aOvertakes: 0,
        bOvertakes: 0,
        timeline: [],
      };
      pairs.set(key, rec);
    }
    return rec;
  }

  // Track previous rank edge for overtake detection (from lo's perspective)
  const prevEdge = new Map<string, number>();

  for (const week of finished) {
    const byEntry = new Map(week.rows.map((r) => [r.entryId, r]));
    const ids = week.rows.map((r) => r.entryId);

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i]!;
        const idB = ids[j]!;
        const rowA = byEntry.get(idA)!;
        const rowB = byEntry.get(idB)!;
        const rec = getOrCreate(idA, idB);

        // Normalize to rec.aId / rec.bId
        const aIsLo = idA === rec.aId;
        const lo = aIsLo ? rowA : rowB;
        const hi = aIsLo ? rowB : rowA;

        const pointDiff = lo.points - hi.points;
        rec.games += 1;
        rec.netPointDiff += pointDiff;
        rec.avgAbsDiff += Math.abs(pointDiff);

        const rankEdge = hi.rank - lo.rank; // positive = lo finished higher
        const key = pairKey(rec.aId, rec.bId);
        const prev = prevEdge.get(key);

        if (lo.rank < hi.rank) {
          rec.aWins += 1;
          rec.aStreak = rec.aStreak > 0 ? rec.aStreak + 1 : 1;
          rec.bStreak = 0;
          rec.aMaxWinStreak = Math.max(rec.aMaxWinStreak, rec.aStreak);
          if (prev != null && prev < 0) rec.aOvertakes += 1;
        } else if (hi.rank < lo.rank) {
          rec.bWins += 1;
          rec.bStreak = rec.bStreak > 0 ? rec.bStreak + 1 : 1;
          rec.aStreak = 0;
          rec.bMaxWinStreak = Math.max(rec.bMaxWinStreak, rec.bStreak);
          if (prev != null && prev > 0) rec.bOvertakes += 1;
        } else {
          rec.draws += 1;
          rec.aStreak = 0;
          rec.bStreak = 0;
        }

        prevEdge.set(key, rankEdge);
        rec.timeline.push({
          gameweek: week.gameweek,
          aRank: lo.rank,
          bRank: hi.rank,
          rankEdge,
          aPoints: lo.points,
          bPoints: hi.points,
        });
      }
    }
  }

  for (const rec of pairs.values()) {
    if (rec.games > 0) {
      rec.avgAbsDiff = rec.avgAbsDiff / rec.games;
    }
  }

  return pairs;
}

function toNamed(
  rec: PairRecord,
  managers: Map<number, RivalryManager>,
): NamedRivalry | null {
  const a = managers.get(rec.aId);
  const b = managers.get(rec.bId);
  if (!a || !b || rec.games < 1) return null;
  const { title, subtitle } = dramaticTitle(rec, a.displayName, b.displayName);
  return {
    key: pairKey(rec.aId, rec.bId),
    title,
    subtitle,
    a,
    b,
    record: rec,
    dominanceTowardA: dominanceTowardA(rec),
  };
}

/** From A's perspective: wins against B. */
function winsFor(
  rec: PairRecord,
  entryId: number,
): { wins: number; losses: number } {
  if (entryId === rec.aId) return { wins: rec.aWins, losses: rec.bWins };
  return { wins: rec.bWins, losses: rec.aWins };
}

export function buildRivalriesBoard(
  weeks: WeeklyGameweek[],
  managers: RivalryManager[],
): RivalriesBoard {
  const managerMap = new Map(managers.map((m) => [m.entryId, m]));
  const pairsMap = computePairRecords(weeks);
  const namedPairs = [...pairsMap.values()]
    .map((rec) => toNamed(rec, managerMap))
    .filter((p): p is NamedRivalry => p != null)
    .sort((a, b) => b.record.games - a.record.games || b.record.aWins + b.record.bWins - (a.record.aWins + a.record.bWins));

  const n = managers.length;
  const heatmap: Array<Array<number | null>> = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null),
  );

  const indexByEntry = new Map(managers.map((m, i) => [m.entryId, i]));

  for (const pair of namedPairs) {
    const i = indexByEntry.get(pair.a.entryId);
    const j = indexByEntry.get(pair.b.entryId);
    if (i == null || j == null) continue;
    // Cell [i][j] = how much i beats j (0–1)
    heatmap[i]![j] = pair.dominanceTowardA;
    heatmap[j]![i] = 1 - pair.dominanceTowardA;
  }

  const profiles: Record<number, ManagerRivalryProfile> = {};

  for (const manager of managers) {
    let nemesis: NamedRivalry | null = null;
    let nemesisScore = -1;
    let charm: NamedRivalry | null = null;
    let charmScore = -1;

    for (const pair of namedPairs) {
      if (
        pair.a.entryId !== manager.entryId &&
        pair.b.entryId !== manager.entryId
      ) {
        continue;
      }
      const { wins, losses } = winsFor(pair.record, manager.entryId);
      const decided = wins + losses;
      if (decided < 1) continue;

      // Nemesis = the manager you lose to most. Lucky charm = who you beat most.
      if (losses > wins) {
        const lossScore = losses * 2 + losses / decided;
        if (lossScore > nemesisScore) {
          nemesisScore = lossScore;
          nemesis = pair;
        }
      }

      if (wins > losses) {
        const winScore = wins * 2 + wins / decided;
        if (winScore > charmScore) {
          charmScore = winScore;
          charm = pair;
        }
      }
    }

    profiles[manager.entryId] = {
      entryId: manager.entryId,
      nemesis,
      luckyCharm: charm,
    };
  }

  // Most toxic: many games, close record, high avg abs diff
  let toxic: NamedRivalry | null = null;
  let toxicScore = -1;
  for (const pair of namedPairs) {
    const decided = pair.record.aWins + pair.record.bWins;
    if (decided < 4) continue;
    const balance = 1 - Math.abs(pair.dominanceTowardA - 0.5) * 2;
    const score =
      pair.record.games * 1.5 +
      balance * 8 +
      Math.min(pair.record.avgAbsDiff / 10, 5) +
      (pair.record.aOvertakes + pair.record.bOvertakes);
    if (score > toxicScore) {
      toxicScore = score;
      toxic = {
        ...pair,
        title: "Most Toxic Rivalry",
        subtitle: pair.subtitle,
      };
    }
  }

  // Biggest comeback: largest swing from deep deficit to lead in timeline
  let comeback: NamedRivalry | null = null;
  let comebackScore = -1;
  for (const pair of namedPairs) {
    const tl = pair.record.timeline;
    if (tl.length < 4) continue;
    let bestSwing = 0;
    let hero = "a" as "a" | "b";

    // After being deep behind, did they finish ahead in a later week?
    for (let i = 0; i < tl.length; i++) {
      const early = tl.slice(0, i + 1);
      const later = tl.slice(i);
      const minEdge = minOf(early.map((p) => p.rankEdge));
      const maxLater = maxOf(later.map((p) => p.rankEdge));
      if (minEdge != null && maxLater != null) {
        const swingA = maxLater - minEdge;
        if (minEdge < -1 && maxLater > 0 && swingA > bestSwing) {
          bestSwing = swingA;
          hero = "a";
        }
      }
      const minEdgeB = minOf(early.map((p) => -p.rankEdge));
      const maxLaterB = maxOf(later.map((p) => -p.rankEdge));
      if (minEdgeB != null && maxLaterB != null) {
        const swingB = maxLaterB - minEdgeB;
        if (minEdgeB < -1 && maxLaterB > 0 && swingB > bestSwing) {
          bestSwing = swingB;
          hero = "b";
        }
      }
    }

    if (bestSwing > comebackScore) {
      comebackScore = bestSwing;
      const heroName = hero === "a" ? pair.a.displayName : pair.b.displayName;
      const foeName = hero === "a" ? pair.b.displayName : pair.a.displayName;
      comeback = {
        ...pair,
        title: "Biggest Comeback Rivalry",
        subtitle: `${heroName} clawed back from the depths against ${foeName}`,
      };
    }
  }

  return {
    managers,
    heatmap,
    pairs: namedPairs.slice(0, 24),
    toxic,
    comeback,
    profiles,
  };
}

export function rivalryForManager(
  board: RivalriesBoard,
  entryId: number,
): ManagerRivalryProfile | null {
  return board.profiles[entryId] ?? null;
}

/** Timeline from a manager's perspective vs their nemesis. */
export function nemesisTimeline(
  profile: ManagerRivalryProfile,
  entryId: number,
): Array<{ gameweek: number; rankEdge: number; myRank: number; theirRank: number }> {
  const pair = profile.nemesis;
  if (!pair) return [];
  const iAmA = pair.a.entryId === entryId;
  return pair.record.timeline.map((t) => ({
    gameweek: t.gameweek,
    rankEdge: iAmA ? t.rankEdge : -t.rankEdge,
    myRank: iAmA ? t.aRank : t.bRank,
    theirRank: iAmA ? t.bRank : t.aRank,
  }));
}
