import "server-only";

import { cache } from "react";
import {
  fetchAllClassicLeagueStandings,
  fetchBootstrapStatic,
  fetchLiveGameweek,
  fetchManagerEntry,
  fetchManagerHistory,
  fetchManagerPicks,
  fplFetch,
  isFplApiError,
  leagueRosterRows,
  type FplBootstrapStatic,
  type FplClassicLeagueStandings,
  type FplHistoryEvent,
  type FplLiveEvent,
  type FplManagerHistory,
  type FplManagerPicks,
} from "@/lib/fpl";
import { parseMoney, totalPot } from "@/lib/prizes";
import { getLeagueDbState, type LeagueDbState, type StoredManager } from "./db";
import { getLeagueId, roundMoney } from "./format";
import {
  buildLedger,
  suggestSettlements,
} from "./ledger";
import { computeLiveGwPoints, livePointsForElement } from "./live";
import { buildWeeklyGameweeks } from "./weekly";
import type {
  BalanceEvent,
  DashboardData,
  LedgerRow,
  LiveStandingUpdate,
  LiveStandingsPayload,
  ManagerDetail,
  ManagerStanding,
  PrizeSnapshot,
  Settlement,
  SquadPlayer,
  WeeklyGameweek,
} from "./types";

export { suggestSettlements } from "./ledger";

type HistoryMap = Map<number, FplManagerHistory>;

type LeagueSnapshot = {
  leagueId: number;
  standings: FplClassicLeagueStandings;
  bootstrap: FplBootstrapStatic;
  db: LeagueDbState;
  histories: HistoryMap;
  currentEventId: number | null;
  previousEventId: number | null;
};

function errorMessage(error: unknown): string {
  if (isFplApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "Couldn't load FPL data.";
}

async function mapSettled<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<Map<T, R>> {
  const results = await Promise.allSettled(items.map((item) => fn(item)));
  const map = new Map<T, R>();
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      map.set(items[index]!, result.value);
    }
  });
  return map;
}

export const getLeagueSnapshot = cache(
  async (): Promise<
    | { kind: "ok"; data: LeagueSnapshot }
    | { kind: "no_league" }
    | { kind: "error"; message: string }
  > => {
    const leagueId = getLeagueId();
    if (!leagueId) return { kind: "no_league" };

    try {
      const [standings, bootstrap, db] = await Promise.all([
        fetchAllClassicLeagueStandings(leagueId),
        fetchBootstrapStatic(),
        getLeagueDbState(),
      ]);

      const entryIds = leagueRosterRows(standings).map((row) => row.entry);
      const historyEntries = await mapSettled(entryIds, fetchManagerHistory);

      return {
        kind: "ok",
        data: {
          leagueId,
          standings,
          bootstrap,
          db,
          histories: historyEntries,
          currentEventId:
            bootstrap.events.find((event) => event.is_current)?.id ?? null,
          previousEventId:
            bootstrap.events.find((event) => event.is_previous)?.id ?? null,
        },
      };
    } catch (error) {
      console.error("[league] Snapshot failed", error);
      return { kind: "error", message: errorMessage(error) };
    }
  },
);

function storedByEntry(db: LeagueDbState): Map<number, StoredManager> {
  return new Map(
    db.managers
      .filter(
        (manager): manager is StoredManager & { fplEntryId: number } =>
          manager.fplEntryId != null,
      )
      .map((manager) => [manager.fplEntryId, manager]),
  );
}

function weeksFromSnapshot(snapshot: LeagueSnapshot): WeeklyGameweek[] {
  return buildWeeklyGameweeks(
    leagueRosterRows(snapshot.standings),
    snapshot.bootstrap,
    snapshot.histories,
    snapshot.db.weekly,
  );
}

function ledgerFromSnapshot(
  snapshot: LeagueSnapshot,
  weeks: WeeklyGameweek[],
) {
  return buildLedger({
    results: leagueRosterRows(snapshot.standings),
    managers: snapshot.db.managers,
    prize: snapshot.db.prize,
    weeks,
    seasonComplete: seasonIsComplete(snapshot.bootstrap),
  });
}

function isLiveEvent(bootstrap: FplBootstrapStatic): boolean {
  const current = bootstrap.events.find((event) => event.is_current);
  return Boolean(current && !current.finished);
}

function isProvisionalEvent(bootstrap: FplBootstrapStatic): boolean {
  const current = bootstrap.events.find((event) => event.is_current);
  return Boolean(current && current.finished && !current.data_checked);
}

function seasonIsComplete(bootstrap: FplBootstrapStatic): boolean {
  if (bootstrap.events.length === 0) return false;
  return bootstrap.events.every((event) => event.finished);
}

function leagueMeta(snapshot: LeagueSnapshot) {
  const current = snapshot.bootstrap.events.find((event) => event.is_current);
  return {
    leagueId: snapshot.leagueId,
    leagueName: snapshot.standings.league.name,
    currentEventId: current?.id ?? snapshot.currentEventId,
    currentEventName: current?.name ?? null,
    isLive: isLiveEvent(snapshot.bootstrap),
    isProvisional: isProvisionalEvent(snapshot.bootstrap),
    seasonComplete: seasonIsComplete(snapshot.bootstrap),
    lastUpdated: snapshot.standings.last_updated_data,
  };
}

const getLivePointsByEntry = cache(async () => {
  const liveMap = new Map<number, number>();
  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") return liveMap;

  const eventId = snapshot.data.currentEventId;
  if (!eventId) return liveMap;
  if (
    !isLiveEvent(snapshot.data.bootstrap) &&
    !isProvisionalEvent(snapshot.data.bootstrap)
  ) {
    return liveMap;
  }

  try {
    const live = await fetchLiveGameweek(eventId);
    const entryIds = leagueRosterRows(snapshot.data.standings).map(
      (row) => row.entry,
    );
    const picks = await mapSettled(entryIds, (id) =>
      fetchManagerPicks(id, eventId),
    );
    for (const [entryId, squad] of picks) {
      liveMap.set(
        entryId,
        computeLiveGwPoints(squad.picks, live, squad.active_chip),
      );
    }
  } catch (error) {
    console.error("[league] Live points failed", error);
  }

  return liveMap;
});

function toStandings(
  snapshot: LeagueSnapshot,
  livePoints: Map<number, number>,
  ledger: LedgerRow[],
): ManagerStanding[] {
  const stored = storedByEntry(snapshot.db);
  const ledgerByEntry = new Map(ledger.map((row) => [row.entryId, row]));

  return leagueRosterRows(snapshot.standings).map((row) => {
    const manager = stored.get(row.entry);
    const ledgerRow = ledgerByEntry.get(row.entry);
    return {
      entryId: row.entry,
      managerId: manager?.id ?? null,
      name: row.player_name,
      displayName: manager?.displayName || row.player_name,
      teamName: row.entry_name,
      avatarUrl: manager?.avatarUrl ?? null,
      supportedTeamId: manager?.supportedTeamId ?? null,
      supportedTeamCode: manager?.supportedTeamCode ?? null,
      avatarVariant: manager?.avatarVariant ?? 0,
      rank: row.rank,
      lastRank: row.last_rank,
      totalPoints: row.total,
      eventPoints: row.event_total,
      livePoints: livePoints.get(row.entry) ?? null,
      balance: ledgerRow?.balance ?? 0,
      entryFeePaid: ledgerRow?.entryFeePaid ?? false,
      verified: manager?.verified ?? false,
      weeksWon: ledgerRow?.weeksWon ?? 0,
      activityPoints: manager?.activityPoints ?? 0,
    };
  });
}

export const getDashboardData = cache(async (): Promise<
  | { kind: "ok"; data: DashboardData }
  | { kind: "no_league" }
  | { kind: "error"; message: string }
> => {
  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") return snapshot;

  const weeks = weeksFromSnapshot(snapshot.data);
  const ledger = ledgerFromSnapshot(snapshot.data, weeks);
  const livePoints = await getLivePointsByEntry();
  const prize = snapshot.data.db.prize;
  // Pot = entry fee × FPL-linked managers in our DB (not raw FPL roster size).
  const managerCount = snapshot.data.db.managers.filter(
    (manager) => manager.fplEntryId != null,
  ).length;
  const pot = totalPot(prize.entryFeeNum, managerCount);
  const weeklyPaid = roundMoney(
    ledger.reduce((sum, row) => sum + row.weeklyWinnings, 0),
  );
  const seasonReserved =
    prize.overall1stNum +
    prize.overall2ndNum +
    prize.lastPlaceNum +
    prize.customPrizesTotalNum;
  const remaining = roundMoney(
    pot -
      weeklyPaid -
      (seasonIsComplete(snapshot.data.bootstrap) ? seasonReserved : 0),
  );

  const lastFinished =
    [...weeks].reverse().find((week) => week.finished) ?? null;

  return {
    kind: "ok",
    data: {
      meta: leagueMeta(snapshot.data),
      prize,
      standings: toStandings(snapshot.data, livePoints, ledger),
      pot,
      weeklyPaid,
      seasonReserved,
      remaining,
      owed: ledger.filter((row) => row.balance > 0.005).sort((a, b) => b.balance - a.balance),
      owes: ledger.filter((row) => row.balance < -0.005).sort((a, b) => a.balance - b.balance),
      lastWinner: lastFinished,
    },
  };
});

export const getManagersData = cache(async () => {
  const dashboard = await getDashboardData();
  return dashboard;
});

export const getWeeklyResultsData = cache(async (): Promise<
  | {
      kind: "ok";
      meta: ReturnType<typeof leagueMeta>;
      prize: PrizeSnapshot;
      weeks: WeeklyGameweek[];
      standings: ManagerStanding[];
    }
  | { kind: "no_league" }
  | { kind: "error"; message: string }
> => {
  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") return snapshot;

  const weeks = weeksFromSnapshot(snapshot.data);
  const ledger = ledgerFromSnapshot(snapshot.data, weeks);

  return {
    kind: "ok",
    meta: leagueMeta(snapshot.data),
    prize: snapshot.data.db.prize,
    weeks,
    standings: toStandings(snapshot.data, new Map(), ledger),
  };
});

export const getPrizeLedgerData = cache(async (): Promise<
  | {
      kind: "ok";
      meta: ReturnType<typeof leagueMeta>;
      prize: PrizeSnapshot;
      ledger: LedgerRow[];
      settlements: Settlement[];
      pot: number;
      weeklyPaid: number;
      seasonReserved: number;
      remaining: number;
      usingRecorded: boolean;
    }
  | { kind: "no_league" }
  | { kind: "error"; message: string }
> => {
  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") return snapshot;

  const weeks = weeksFromSnapshot(snapshot.data);
  const complete = seasonIsComplete(snapshot.data.bootstrap);
  const ledger = ledgerFromSnapshot(snapshot.data, weeks).sort(
    (a, b) => b.balance - a.balance,
  );

  const prize = snapshot.data.db.prize;
  const managerCount = snapshot.data.db.managers.filter(
    (manager) => manager.fplEntryId != null,
  ).length;
  const pot = totalPot(prize.entryFeeNum, managerCount);
  const weeklyPaid = roundMoney(
    ledger.reduce((sum, row) => sum + row.weeklyWinnings, 0),
  );
  const seasonReserved =
    prize.overall1stNum +
    prize.overall2ndNum +
    prize.lastPlaceNum +
    prize.customPrizesTotalNum;
  const remaining = roundMoney(
    pot - weeklyPaid - (complete ? seasonReserved : 0),
  );

  return {
    kind: "ok",
    meta: leagueMeta(snapshot.data),
    prize,
    ledger,
    settlements: suggestSettlements(ledger),
    pot,
    weeklyPaid,
    seasonReserved,
    remaining,
    usingRecorded: false,
  };
});

function formationFromStarters(starters: SquadPlayer[]): string {
  const def = starters.filter((p) => p.elementType === 2).length;
  const mid = starters.filter((p) => p.elementType === 3).length;
  const fwd = starters.filter((p) => p.elementType === 4).length;
  return `${def}-${mid}-${fwd}`;
}

function buildSquad(
  picks: FplManagerPicks,
  bootstrap: FplBootstrapStatic,
  live: FplLiveEvent | null,
): SquadPlayer[] {
  const elements = new Map(bootstrap.elements.map((el) => [el.id, el]));
  const teams = new Map(bootstrap.teams.map((team) => [team.id, team]));
  const positions = new Map(
    bootstrap.element_types.map((type) => [type.id, type.singular_name_short]),
  );

  return picks.picks.map((pick) => {
    const element = elements.get(pick.element);
    const liveStats = livePointsForElement(
      pick.element,
      live,
      element?.event_points ?? 0,
    );
    return {
      elementId: pick.element,
      webName: element?.web_name ?? `#${pick.element}`,
      teamShort: element ? (teams.get(element.team)?.short_name ?? "") : "",
      pickPosition: pick.position,
      elementType: element?.element_type ?? 0,
      positionShort: element
        ? (positions.get(element.element_type) ?? "")
        : "",
      isCaptain: pick.is_captain,
      isVice: pick.is_vice_captain,
      multiplier: pick.multiplier,
      points: liveStats.points,
      minutes: liveStats.minutes,
      isBench: pick.position > 11,
    };
  });
}

function balanceEventsForManager(
  entryId: number,
  weeks: WeeklyGameweek[],
  prize: PrizeSnapshot,
  standing: ManagerStanding | null,
  seasonComplete: boolean,
  managerCount: number,
  entryFeePaid: boolean,
): BalanceEvent[] {
  const events: BalanceEvent[] = [];
  let running = 0;

  if (prize.entryFeeNum > 0) {
    const delta = entryFeePaid ? prize.entryFeeNum : -prize.entryFeeNum;
    running = roundMoney(running + delta);
    events.push({
      label: entryFeePaid ? "Entry fee paid" : "Entry fee (unpaid)",
      gameweek: null,
      amount: delta,
      running,
    });
  }

  for (const week of weeks) {
    if (!week.finished || !week.winnerEntryIds.includes(entryId)) continue;
    const amount = roundMoney(
      prize.weeklyWinnerNum / Math.max(1, week.winnerEntryIds.length),
    );
    running = roundMoney(running + amount);
    events.push({
      label: `GW ${week.gameweek} winner`,
      gameweek: week.gameweek,
      amount,
      running,
    });
  }

  if (seasonComplete && standing) {
    if (standing.rank === 1 && prize.overall1stNum) {
      running = roundMoney(running + prize.overall1stNum);
      events.push({
        label: "Overall 1st",
        gameweek: null,
        amount: prize.overall1stNum,
        running,
      });
    }
    if (standing.rank === 2 && prize.overall2ndNum) {
      running = roundMoney(running + prize.overall2ndNum);
      events.push({
        label: "Overall 2nd",
        gameweek: null,
        amount: prize.overall2ndNum,
        running,
      });
    }
    if (standing.rank === managerCount && prize.lastPlaceNum) {
      running = roundMoney(running + prize.lastPlaceNum);
      events.push({
        label: "Last place",
        gameweek: null,
        amount: prize.lastPlaceNum,
        running,
      });
    }
  }

  return events;
}

export async function getManagerDetail(
  entryId: number,
): Promise<
  | { kind: "ok"; data: ManagerDetail }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
> {
  if (!Number.isInteger(entryId) || entryId <= 0) return { kind: "not_found" };

  const snapshotResult = await getLeagueSnapshot();
  const snapshot: LeagueSnapshot | null =
    snapshotResult.kind === "ok" ? snapshotResult.data : null;

  try {
    const [entry, bootstrap, db] = await Promise.all([
      fetchManagerEntry(entryId),
      snapshot?.bootstrap
        ? Promise.resolve(snapshot.bootstrap)
        : fetchBootstrapStatic(),
      snapshot ? Promise.resolve(snapshot.db) : getLeagueDbState(),
    ]);

    const eventId =
      snapshot?.currentEventId ??
      entry.current_event ??
      bootstrap.events.find((event) => event.is_current)?.id ??
      bootstrap.events.find((event) => event.is_previous)?.id ??
      null;

    const [picks, live, history] = await Promise.all([
      eventId
        ? fetchManagerPicks(entryId, eventId).catch(() => null)
        : Promise.resolve(null),
      eventId &&
      (isLiveEvent(bootstrap) || isProvisionalEvent(bootstrap))
        ? fetchLiveGameweek(eventId).catch(() => null)
        : Promise.resolve(null),
      snapshot?.histories.get(entryId) ??
        fetchManagerHistory(entryId).catch(() => null),
    ]);

    const weeks = snapshot ? weeksFromSnapshot(snapshot) : [];
    const ledger = snapshot ? ledgerFromSnapshot(snapshot, weeks) : [];
    const livePoints = snapshot
      ? await getLivePointsByEntry()
      : new Map<number, number>();
    const standings = snapshot
      ? toStandings(snapshot, livePoints, ledger)
      : [];
    const standing = standings.find((row) => row.entryId === entryId) ?? null;

    const squad = picks ? buildSquad(picks, bootstrap, live) : [];
    const starters = squad.filter((player) => !player.isBench);
    const bench = squad.filter((player) => player.isBench);
    const event = bootstrap.events.find((item) => item.id === eventId);
    const meta = snapshot
      ? leagueMeta(snapshot)
      : {
          leagueId: getLeagueId() ?? 0,
          leagueName: "FPL",
          currentEventId: eventId,
          currentEventName: event?.name ?? null,
          isLive: isLiveEvent(bootstrap),
          isProvisional: isProvisionalEvent(bootstrap),
          seasonComplete: seasonIsComplete(bootstrap),
          lastUpdated: null,
        };

    const stored = db.managers.find((manager) => manager.fplEntryId === entryId);
    const historyRows: FplHistoryEvent[] = history?.current ?? [];
    const events = balanceEventsForManager(
      entryId,
      weeks,
      db.prize,
      standing,
      seasonIsComplete(bootstrap),
      standings.length,
      stored?.entryFeePaid ?? standing?.entryFeePaid ?? false,
    );

    return {
      kind: "ok",
      data: {
        meta,
        prize: db.prize,
        standing,
        entryId,
        playerName: stored?.displayName || `${entry.player_first_name} ${entry.player_last_name}`,
        teamName: entry.name,
        region: entry.player_region_name,
        overallRank: entry.summary_overall_rank,
        eventPoints: standing?.livePoints ?? entry.summary_event_points,
        totalPoints: entry.summary_overall_points,
        bank: entry.last_deadline_bank / 10,
        squadValue: entry.last_deadline_value / 10,
        eventId,
        eventName: event?.name ?? null,
        activeChip: picks?.active_chip ?? null,
        chips: history?.chips ?? [],
        starters,
        bench,
        formation: formationFromStarters(starters),
        history: historyRows,
        pastSeasons: history?.past ?? [],
        balanceEvents: events,
        balance: standing?.balance ?? parseMoney(stored?.currentBalance) ?? 0,
        activityPoints: stored?.activityPoints ?? 0,
      },
    };
  } catch (error) {
    if (isFplApiError(error) && error.status === 404) return { kind: "not_found" };
    console.error("[league] Manager detail failed", error);
    return { kind: "error", message: errorMessage(error) };
  }
}

/**
 * Match-day snapshot: standings ranks + live GW points.
 * Uses short / no-store fetches so polling stays fresh.
 */
export async function getLiveStandingsPayload(): Promise<
  | { kind: "ok"; data: LiveStandingsPayload }
  | { kind: "idle"; data: LiveStandingsPayload }
  | { kind: "no_league" }
  | { kind: "error"; message: string }
> {
  const leagueId = getLeagueId();
  if (!leagueId) return { kind: "no_league" };

  try {
    const fresh = { revalidate: 0 as const };
    const [bootstrap, standings] = await Promise.all([
      fplFetch<FplBootstrapStatic>("/bootstrap-static/", fresh),
      fplFetch<FplClassicLeagueStandings>(
        `/leagues-classic/${leagueId}/standings/`,
        fresh,
      ),
    ]);

    // Walk standings pages if needed (small private leagues usually fit one page)
    let pageResults = [...standings.standings.results];
    let page = standings.standings.page;
    let hasNext = standings.standings.has_next;
    while (hasNext) {
      page += 1;
      const next = await fplFetch<FplClassicLeagueStandings>(
        `/leagues-classic/${leagueId}/standings/?page_standings=${page}`,
        fresh,
      );
      pageResults = [...pageResults, ...next.standings.results];
      hasNext = next.standings.has_next;
    }

    let newEntries = [...standings.new_entries.results];
    let newPage = standings.new_entries.page;
    let newHasNext = standings.new_entries.has_next;
    while (newHasNext) {
      newPage += 1;
      const next = await fplFetch<FplClassicLeagueStandings>(
        `/leagues-classic/${leagueId}/standings/?page_new_entries=${newPage}`,
        fresh,
      );
      newEntries = [...newEntries, ...next.new_entries.results];
      newHasNext = next.new_entries.has_next;
    }

    const results = leagueRosterRows({
      ...standings,
      standings: {
        ...standings.standings,
        has_next: false,
        page: 1,
        results: pageResults,
      },
      new_entries: {
        ...standings.new_entries,
        has_next: false,
        page: 1,
        results: newEntries,
      },
    });

    const current = bootstrap.events.find((event) => event.is_current) ?? null;
    const isLive = Boolean(current && !current.finished);
    const isProvisional = Boolean(
      current && current.finished && !current.data_checked,
    );

    const livePoints = new Map<number, number>();
    const playerOwned = new Map<
      number,
      { points: number; ownedBy: number }
    >();

    if (current && (isLive || isProvisional)) {
      const live = await fplFetch<FplLiveEvent>(
        `/event/${current.id}/live/`,
        fresh,
      );
      const statsById = new Map(live.elements.map((el) => [el.id, el.stats]));
      const picks = await mapSettled(
        results.map((row) => row.entry),
        (id) =>
          fplFetch<FplManagerPicks>(
            `/entry/${id}/event/${current.id}/picks/`,
            fresh,
          ),
      );
      for (const [entryId, squad] of picks) {
        livePoints.set(
          entryId,
          computeLiveGwPoints(squad.picks, live, squad.active_chip),
        );

        for (const pick of squad.picks) {
          if (pick.multiplier <= 0) continue;
          const stats = statsById.get(pick.element);
          if (!stats) continue;
          const existing = playerOwned.get(pick.element);
          if (existing) {
            existing.ownedBy += 1;
          } else {
            playerOwned.set(pick.element, {
              points: stats.total_points,
              ownedBy: 1,
            });
          }
        }
      }
    }

    const liveStandings: LiveStandingUpdate[] = results.map((row) => ({
      entryId: row.entry,
      playerName: row.player_name,
      teamName: row.entry_name,
      rank: row.rank,
      lastRank: row.last_rank,
      totalPoints: row.total,
      eventPoints: row.event_total,
      livePoints: livePoints.get(row.entry) ?? null,
    }));

    const topScorers = [...liveStandings]
      .map((row) => ({
        entryId: row.entryId,
        playerName: row.playerName,
        teamName: row.teamName,
        points: row.livePoints ?? row.eventPoints,
      }))
      .sort((a, b) => b.points - a.points || a.playerName.localeCompare(b.playerName))
      .slice(0, 8);

    const elementById = new Map(
      bootstrap.elements.map((el) => [el.id, el] as const),
    );
    const playerScorers = [...playerOwned.entries()]
      .map(([elementId, info]) => {
        const el = elementById.get(elementId);
        return {
          elementId,
          name: el?.web_name ?? `Player ${elementId}`,
          teamId: el?.team ?? 0,
          points: info.points,
          ownedBy: info.ownedBy,
        };
      })
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.ownedBy - a.ownedBy ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 8);

    const payload: LiveStandingsPayload = {
      isLive,
      isProvisional,
      leagueName: standings.league.name || "FPL League",
      currentEventId: current?.id ?? null,
      currentEventName: current?.name ?? null,
      fetchedAt: new Date().toISOString(),
      standings: liveStandings,
      topScorers,
      playerScorers,
    };

    if (!isLive && !isProvisional) {
      return { kind: "idle", data: payload };
    }

    return { kind: "ok", data: payload };
  } catch (error) {
    console.error("[league] Live standings failed", error);
    return { kind: "error", message: errorMessage(error) };
  }
}
