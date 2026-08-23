import { parseMoney } from "@/lib/prizes";
import { roundMoney } from "@/lib/league/format";
import type { StoredManager } from "@/lib/league/db";
import type {
  LedgerRow,
  PrizeSnapshot,
  Settlement,
  WeeklyGameweek,
} from "@/lib/league/types";
import type { FplLeagueStandingRow } from "@/lib/fpl";

export function weeksWonByEntry(weeks: WeeklyGameweek[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const week of weeks) {
    if (!week.finished) continue;
    for (const entryId of week.winnerEntryIds) {
      counts.set(entryId, (counts.get(entryId) ?? 0) + 1);
    }
  }
  return counts;
}

export function seasonPrizesByEntry(
  results: FplLeagueStandingRow[],
  prize: PrizeSnapshot,
  seasonComplete: boolean,
): Map<number, number> {
  const map = new Map<number, number>();
  if (!seasonComplete || results.length === 0) return map;

  const first = results.find((row) => row.rank === 1);
  const second = results.find((row) => row.rank === 2);
  const last = [...results].sort((a, b) => b.rank - a.rank)[0];

  if (first) map.set(first.entry, prize.overall1stNum);
  if (second) {
    map.set(second.entry, (map.get(second.entry) ?? 0) + prize.overall2ndNum);
  }
  if (last) {
    map.set(last.entry, (map.get(last.entry) ?? 0) + prize.lastPlaceNum);
  }
  return map;
}

/**
 * Entry fee contribution on the balance sheet:
 * - unpaid → −entryFee (owing)
 * - paid in full → +entryFee (stake transferred)
 * Wins / season prizes stack on top.
 */
export function entryFeeBalanceDelta(
  entryFee: number,
  entryFeePaid: boolean,
): number {
  const fee = parseMoney(entryFee);
  if (fee <= 0) return 0;
  return entryFeePaid ? fee : -fee;
}

export function computeManagerBalance(args: {
  weeklyWinnings: number;
  seasonPrize: number;
  entryFee: number;
  entryFeePaid: boolean;
}): number {
  return roundMoney(
    args.weeklyWinnings +
      args.seasonPrize +
      entryFeeBalanceDelta(args.entryFee, args.entryFeePaid),
  );
}

export function buildLedger(args: {
  results: FplLeagueStandingRow[];
  managers: StoredManager[];
  prize: PrizeSnapshot;
  weeks: WeeklyGameweek[];
  seasonComplete: boolean;
}): LedgerRow[] {
  const { results, managers, prize, weeks, seasonComplete } = args;
  const stored = new Map(
    managers
      .filter((m): m is StoredManager & { fplEntryId: number } => m.fplEntryId != null)
      .map((m) => [m.fplEntryId, m]),
  );
  const wins = weeksWonByEntry(weeks);
  const season = seasonPrizesByEntry(results, prize, seasonComplete);

  return results.map((row) => {
    const manager = stored.get(row.entry);
    const weeksWon = wins.get(row.entry) ?? 0;
    const winnerShares = weeks
      .filter((week) => week.finished && week.winnerEntryIds.includes(row.entry))
      .reduce((sum, week) => {
        const share =
          week.winnerEntryIds.length > 0
            ? prize.weeklyWinnerNum / week.winnerEntryIds.length
            : 0;
        return sum + share;
      }, 0);

    const seasonPrize = season.get(row.entry) ?? 0;
    const verified = manager?.verified ?? false;
    const entryFeePaid = verified && (manager?.entryFeePaid ?? false);
    const computedBalance = computeManagerBalance({
      weeklyWinnings: winnerShares,
      seasonPrize,
      // Unverified seats are not in the pot yet — no entry-fee line.
      entryFee: verified ? prize.entryFeeNum : 0,
      entryFeePaid,
    });

    return {
      entryId: row.entry,
      name: manager?.displayName || row.player_name,
      teamName: row.entry_name,
      rank: row.rank,
      weeksWon,
      entryFee: prize.entryFeeNum,
      entryFeePaid,
      weeklyWinnings: roundMoney(winnerShares),
      seasonPrize,
      computedBalance,
      recordedBalance:
        manager?.currentBalance != null
          ? parseMoney(manager.currentBalance)
          : null,
      // Always use live computed balance so unpaid entry fees stay −fee.
      balance: computedBalance,
    };
  });
}

/** Compute nets for every stored manager (used when writing balances). */
export function computeBalancesForManagers(args: {
  managers: StoredManager[];
  results: FplLeagueStandingRow[];
  prize: PrizeSnapshot;
  weeks: WeeklyGameweek[];
  seasonComplete: boolean;
}): Array<{
  managerId: number;
  fplEntryId: number;
  balance: number;
  entryFeePaid: boolean;
}> {
  const ledger = buildLedger({
    results: args.results,
    managers: args.managers,
    prize: args.prize,
    weeks: args.weeks,
    seasonComplete: args.seasonComplete,
  });
  const byEntry = new Map(ledger.map((row) => [row.entryId, row]));

  return args.managers
    .filter(
      (manager): manager is StoredManager & { fplEntryId: number } =>
        manager.fplEntryId != null,
    )
    .map((manager) => {
      const fromLedger = byEntry.get(manager.fplEntryId);
      if (fromLedger != null) {
        return {
          managerId: manager.id,
          fplEntryId: manager.fplEntryId,
          balance: fromLedger.computedBalance,
          entryFeePaid: fromLedger.entryFeePaid,
        };
      }
      return {
        managerId: manager.id,
        fplEntryId: manager.fplEntryId,
        balance: computeManagerBalance({
          weeklyWinnings: 0,
          seasonPrize: 0,
          entryFee: manager.verified ? args.prize.entryFeeNum : 0,
          entryFeePaid: manager.verified && manager.entryFeePaid,
        }),
        entryFeePaid: manager.verified && manager.entryFeePaid,
      };
    });
}

export function suggestSettlements(rows: LedgerRow[]): Settlement[] {
  const debtors = rows
    .filter((row) => row.balance < -0.005)
    .map((row) => ({ ...row, remaining: roundMoney(-row.balance) }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = rows
    .filter((row) => row.balance > 0.005)
    .map((row) => ({ ...row, remaining: row.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = roundMoney(Math.min(debtor.remaining, creditor.remaining));
    if (amount > 0) {
      transfers.push({
        fromEntryId: debtor.entryId,
        fromName: debtor.name,
        toEntryId: creditor.entryId,
        toName: creditor.name,
        amount,
      });
    }
    debtor.remaining = roundMoney(debtor.remaining - amount);
    creditor.remaining = roundMoney(creditor.remaining - amount);
    if (debtor.remaining <= 0.005) i += 1;
    if (creditor.remaining <= 0.005) j += 1;
  }
  return transfers;
}
