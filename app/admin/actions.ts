"use server";

import { and, count, eq, isNotNull } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  managers,
  managerAccounts,
  balances,
  weeklyResults,
  prizeConfig,
} from "@/lib/db";
import { requireAdmin, getAuthUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  fetchAllClassicLeagueStandings,
  fetchBootstrapStatic,
  fetchManagerEntry,
  fetchManagerHistory,
  leagueRosterRows,
} from "@/lib/fpl";
import { getLeagueId } from "@/lib/league/format";
import { getLeagueDbState, getLeagueDbStateFresh } from "@/lib/league/db";
import { buildWeeklyGameweeks } from "@/lib/league/weekly";
import { computeBalancesForManagers } from "@/lib/league/ledger";
import {
  type ActionResult,
  type PrizeFormState,
  revalidateLeaguePaths,
} from "@/lib/admin/shared";
import {
  DEFAULT_CURRENCY,
  EMPTY_PRIZE_CONFIG,
  moneyToDb,
  parseCustomPrizes,
  type PrizeConfigFormValues,
} from "@/lib/prizes";
import { canonicalKeyFromName, preferredDisplayName } from "@/lib/history/names";
import {
  importHistoricalFromPath,
  type ImportHistoricalResult,
} from "@/lib/history/import";
import {
  awardActivityPoints,
  getActivityPrizeDisplay,
  listLeagueManagersForActivity,
  listRecentActivityEvents,
  setActivityPrizeDisplay,
  ACTIVITY_ACTIONS,
} from "@/lib/activity";

async function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not set.");
  }
  return getDb();
}

/** Defense in depth — layout also gates /admin, but actions can be invoked directly. */
async function requireAdminAction(): Promise<ActionResult | null> {
  const user = await getAuthUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return { ok: false, message: "Unauthorized." };
  }
  return null;
}

export async function getAdminOverview(): Promise<{
  configured: boolean;
  managerCount: number;
  historicalManagerCount: number;
  weeklyResultCount: number;
  hasPrizeConfig: boolean;
  leagueId: number | null;
}> {
  await requireAdmin();
  const leagueId = getLeagueId();
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      managerCount: 0,
      historicalManagerCount: 0,
      weeklyResultCount: 0,
      hasPrizeConfig: false,
      leagueId,
    };
  }

  const db = getDb();
  try {
    const [leagueManagers] = await db
      .select({ value: count() })
      .from(managers)
      .where(isNotNull(managers.fplEntryId));
    const [allManagers] = await db.select({ value: count() }).from(managers);
    const [weeklyTotal] = await db.select({ value: count() }).from(weeklyResults);
    const [prizeRow] = await db
      .select({ id: prizeConfig.id })
      .from(prizeConfig)
      .limit(1);

    const leagueCount = leagueManagers?.value ?? 0;
    const totalCount = allManagers?.value ?? 0;

    return {
      configured: true,
      managerCount: leagueCount,
      historicalManagerCount: Math.max(0, totalCount - leagueCount),
      weeklyResultCount: weeklyTotal?.value ?? 0,
      hasPrizeConfig: Boolean(prizeRow),
      leagueId,
    };
  } catch (error) {
    console.error("[admin] Overview failed", error);
    return {
      configured: true,
      managerCount: 0,
      historicalManagerCount: 0,
      weeklyResultCount: 0,
      hasPrizeConfig: false,
      leagueId,
    };
  }
}

export async function syncManagersFromLeague(): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const leagueId = getLeagueId();
    if (!leagueId) {
      return { ok: false, message: "Set FPL_LEAGUE_ID in .env.local first." };
    }
    const db = await requireDb();
    const dbState = await getLeagueDbStateFresh();
    const standings = await fetchAllClassicLeagueStandings(leagueId);
    const rows = leagueRosterRows(standings);
    if (rows.length === 0) {
      return { ok: false, message: "League standings are empty." };
    }

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const key = canonicalKeyFromName(row.player_name);
      const display = preferredDisplayName(row.player_name, key);

      const [byEntry] = await db
        .select({ id: managers.id })
        .from(managers)
        .where(eq(managers.fplEntryId, row.entry))
        .limit(1);

      if (byEntry) {
        await db
          .update(managers)
          .set({
            name: display,
            displayName: display,
            canonicalKey: key,
          })
          .where(eq(managers.id, byEntry.id));
        updated += 1;
        continue;
      }

      // Link historical-only manager (same name, no FPL id yet).
      const [byName] = key
        ? await db
            .select({ id: managers.id })
            .from(managers)
            .where(eq(managers.canonicalKey, key))
            .limit(1)
        : [];

      if (byName) {
        await db
          .update(managers)
          .set({
            fplEntryId: row.entry,
            name: display,
            displayName: display,
          })
          .where(eq(managers.id, byName.id));
        updated += 1;
        continue;
      }

      const [inserted] = await db
        .insert(managers)
        .values({
          fplEntryId: row.entry,
          canonicalKey: key || `entry_${row.entry}`,
          name: display,
          displayName: display,
        })
        .returning({ id: managers.id });
      if (inserted) {
        const fee = dbState.prize.entryFeeNum;
        await db.insert(balances).values({
          managerId: inserted.id,
          currentBalance: (-fee).toFixed(2),
          entryFeePaid: false,
        });
      }
      created += 1;
    }

    revalidateLeaguePaths();
    const recalc = await recalculateBalances();
    return {
      ok: true,
      message: `Synced ${rows.length} managers (${created} new, ${updated} updated). ${recalc.ok ? recalc.message : ""}`.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't sync managers.",
    };
  }
}

export async function addManager(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const db = await requireDb();
    const entryId = Number(String(formData.get("fplEntryId") ?? "").trim());
    const displayName = String(formData.get("displayName") ?? "").trim();

    if (!Number.isInteger(entryId) || entryId <= 0) {
      return { ok: false, message: "Enter a valid FPL entry ID." };
    }

    const [existing] = await db
      .select({ id: managers.id })
      .from(managers)
      .where(eq(managers.fplEntryId, entryId))
      .limit(1);
    if (existing) {
      return { ok: false, message: "That manager is already in the league DB." };
    }

    let name = displayName;
    let teamHint = "";
    try {
      const entry = await fetchManagerEntry(entryId);
      name =
        displayName ||
        `${entry.player_first_name} ${entry.player_last_name}`.trim();
      teamHint = entry.name;
    } catch {
      if (!displayName) {
        return {
          ok: false,
          message: "Couldn't load that entry from FPL. Add a display name.",
        };
      }
    }

    const resolvedName = name || `Entry ${entryId}`;
    const key =
      canonicalKeyFromName(resolvedName) || `entry_${entryId}`;

    const [inserted] = await db
      .insert(managers)
      .values({
        fplEntryId: entryId,
        canonicalKey: key,
        name: resolvedName,
        displayName: preferredDisplayName(resolvedName, key),
      })
      .returning({ id: managers.id });

    if (inserted) {
      const fee = (await getLeagueDbStateFresh()).prize.entryFeeNum;
      await db.insert(balances).values({
        managerId: inserted.id,
        currentBalance: (-fee).toFixed(2),
        entryFeePaid: false,
      });
    }

    revalidateLeaguePaths();
    return {
      ok: true,
      message: teamHint
        ? `Added ${name} (${teamHint}).`
        : `Added ${name}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Couldn't add manager.",
    };
  }
}

export async function updateManager(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const db = await requireDb();
    const id = Number(formData.get("managerId"));
    const displayName = String(formData.get("displayName") ?? "").trim();
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false, message: "Invalid manager." };
    }
    if (!displayName) {
      return { ok: false, message: "Display name is required." };
    }

    await db
      .update(managers)
      .set({
        displayName,
        name: displayName,
        canonicalKey:
          canonicalKeyFromName(displayName) || `manager_${id}`,
      })
      .where(eq(managers.id, id));

    revalidateLeaguePaths();
    return { ok: true, message: "Manager updated." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't update manager.",
    };
  }
}

export async function removeManager(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const db = await requireDb();
    const id = Number(formData.get("managerId"));
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false, message: "Invalid manager." };
    }

    await db.delete(managers).where(eq(managers.id, id));
    revalidateLeaguePaths();
    return { ok: true, message: "Manager removed." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't remove manager.",
    };
  }
}

export async function listAdminManagers() {
  await requireAdmin();
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: managers.id,
      fplEntryId: managers.fplEntryId,
      name: managers.name,
      displayName: managers.displayName,
      currentBalance: balances.currentBalance,
      entryFeePaid: balances.entryFeePaid,
      activityPoints: managers.activityPoints,
      accountUserId: managerAccounts.userId,
    })
    .from(managers)
    .leftJoin(balances, eq(balances.managerId, managers.id))
    .leftJoin(managerAccounts, eq(managerAccounts.managerId, managers.id))
    .where(isNotNull(managers.fplEntryId))
    .orderBy(managers.displayName);

  return rows.map((row) => ({
    id: row.id,
    fplEntryId: row.fplEntryId,
    name: row.name,
    displayName: row.displayName,
    currentBalance: row.currentBalance,
    entryFeePaid: Boolean(row.entryFeePaid),
    activityPoints: row.activityPoints,
    verified: Boolean(row.accountUserId),
  }));
}

export async function setEntryFeePaid(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const db = await requireDb();
    const managerId = Number(formData.get("managerId"));
    const paid = String(formData.get("paid") ?? "") === "true";

    if (!Number.isInteger(managerId) || managerId <= 0) {
      return { ok: false, message: "Invalid manager." };
    }

    const [existing] = await db
      .select({ id: balances.id })
      .from(balances)
      .where(eq(balances.managerId, managerId))
      .limit(1);

    if (existing) {
      await db
        .update(balances)
        .set({ entryFeePaid: paid, updatedAt: new Date() })
        .where(eq(balances.id, existing.id));
    } else {
      const fee = (await getLeagueDbStateFresh()).prize.entryFeeNum;
      await db.insert(balances).values({
        managerId,
        currentBalance: (paid ? fee : -fee).toFixed(2),
        entryFeePaid: paid,
      });
    }

    const recalc = await recalculateBalances();
    revalidateLeaguePaths();
    return {
      ok: true,
      message: paid
        ? `Marked entry fee paid. ${recalc.ok ? recalc.message : ""}`.trim()
        : `Marked entry fee unpaid. ${recalc.ok ? recalc.message : ""}`.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't update entry fee status.",
    };
  }
}

export async function getWinnersAdminData(gameweek?: number) {
  await requireAdmin();
  const leagueId = getLeagueId();
  if (!leagueId) {
    return { kind: "no_league" as const };
  }
  if (!isDatabaseConfigured()) {
    return { kind: "no_db" as const };
  }

  try {
    const [standings, bootstrap, dbState] = await Promise.all([
      fetchAllClassicLeagueStandings(leagueId),
      fetchBootstrapStatic(),
      getLeagueDbState(),
    ]);

    const roster = leagueRosterRows(standings);
    const entryIds = roster.map((row) => row.entry);
    const histories = new Map<
      number,
      Awaited<ReturnType<typeof fetchManagerHistory>>
    >();
    await Promise.all(
      entryIds.map(async (id) => {
        try {
          histories.set(id, await fetchManagerHistory(id));
        } catch {
          /* skip */
        }
      }),
    );

    const weeks = buildWeeklyGameweeks(
      roster,
      bootstrap,
      histories,
      dbState.weekly,
    );

    const events = bootstrap.events
      .filter((event) => event.id <= (bootstrap.events.find((e) => e.is_current)?.id ?? 38) + 1)
      .map((event) => ({
        id: event.id,
        name: event.name,
        finished: event.finished,
        isCurrent: event.is_current,
      }));

    const selected =
      gameweek && weeks.some((w) => w.gameweek === gameweek)
        ? gameweek
        : (weeks.filter((w) => w.finished).at(-1)?.gameweek ??
          events.find((e) => e.isCurrent)?.id ??
          weeks.at(-1)?.gameweek ??
          events[0]?.id ??
          1);

    const week =
      weeks.find((w) => w.gameweek === selected) ??
      ({
        gameweek: selected,
        finished: false,
        isCurrent: false,
        winnerNames: [] as string[],
        winnerEntryIds: [] as number[],
        winnerPoints: 0,
        rows: roster.map((row, index) => ({
          entryId: row.entry,
          name: row.player_name,
          teamName: row.entry_name,
          points: 0,
          rank: index + 1,
          isWinner: false,
        })),
        manuallySet: false,
      });

    return {
      kind: "ok" as const,
      events,
      selected,
      week,
      managers: dbState.managers,
      prize: dbState.prize,
    };
  } catch (error) {
    return {
      kind: "error" as const,
      message:
        error instanceof Error ? error.message : "Couldn't load winners data.",
    };
  }
}

export async function saveWeeklyWinners(
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const db = await requireDb();
    const gameweek = Number(formData.get("gameweek"));
    if (!Number.isInteger(gameweek) || gameweek <= 0) {
      return { ok: false, message: "Pick a valid gameweek." };
    }

    const winnerIds = new Set(
      formData
        .getAll("winnerEntryId")
        .map((value) => Number(value))
        .filter((id) => Number.isInteger(id) && id > 0),
    );

    const payloadRaw = String(formData.get("rowsJson") ?? "[]");
    let rows: Array<{
      entryId: number;
      points: number;
      rank: number;
    }>;
    try {
      rows = JSON.parse(payloadRaw) as typeof rows;
    } catch {
      return { ok: false, message: "Invalid scores payload." };
    }

    if (rows.length === 0) {
      return { ok: false, message: "No manager rows to save." };
    }

    const dbManagers = await db.select().from(managers);
    const byEntry = new Map(
      dbManagers
        .filter((m) => m.fplEntryId != null)
        .map((m) => [m.fplEntryId as number, m]),
    );

    const missingFromDb = rows
      .map((row) => row.entryId)
      .filter((entryId) => !byEntry.has(entryId));

    // Selected winners must be synced managers — otherwise we can't award them.
    const missingWinners = [...winnerIds].filter((id) => !byEntry.has(id));
    if (missingWinners.length > 0) {
      return {
        ok: false,
        message: `Winner entry ${missingWinners.join(", ")} isn't in the DB. Sync managers from FPL first (Admin → Managers).`,
      };
    }

    if (winnerIds.size === 0) {
      return {
        ok: false,
        message: "Tick at least one winner before saving.",
      };
    }

    let saved = 0;
    for (const row of rows) {
      const manager = byEntry.get(row.entryId);
      if (!manager) continue; // FPL-only member not synced yet — skip

      const values = {
        gameweek,
        managerId: manager.id,
        points: row.points,
        rank: row.rank,
        isWinner: winnerIds.has(row.entryId),
      };

      const [existing] = await db
        .select({ id: weeklyResults.id })
        .from(weeklyResults)
        .where(
          and(
            eq(weeklyResults.gameweek, gameweek),
            eq(weeklyResults.managerId, manager.id),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(weeklyResults)
          .set({
            points: values.points,
            rank: values.rank,
            isWinner: values.isWinner,
          })
          .where(eq(weeklyResults.id, existing.id));
      } else {
        await db.insert(weeklyResults).values(values);
      }
      saved += 1;
    }

    // Auto-recalculate balances after saving winners
    const recalc = await recalculateBalances();
    revalidateLeaguePaths();

    const winnerCount = winnerIds.size;
    const skippedNote =
      missingFromDb.length > 0
        ? ` Skipped ${missingFromDb.length} FPL entr${missingFromDb.length === 1 ? "y" : "ies"} not in the DB (${missingFromDb.join(", ")}) — sync managers to include them.`
        : "";

    return {
      ok: true,
      message: `Saved GW ${gameweek} for ${saved} manager${saved === 1 ? "" : "s"} (${winnerCount} winner${winnerCount === 1 ? "" : "s"}). ${recalc.message}${skippedNote}`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't save weekly winners.",
    };
  }
}

export async function clearWeeklyWinners(
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const db = await requireDb();
    const gameweek = Number(formData.get("gameweek"));
    if (!Number.isInteger(gameweek) || gameweek <= 0) {
      return { ok: false, message: "Pick a valid gameweek." };
    }

    await db
      .delete(weeklyResults)
      .where(eq(weeklyResults.gameweek, gameweek));

    const recalc = await recalculateBalances();
    revalidateLeaguePaths();
    return {
      ok: true,
      message: `Cleared manual results for GW ${gameweek}. ${recalc.message}`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't clear weekly results.",
    };
  }
}

export async function recalculateBalances(): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const leagueId = getLeagueId();
    if (!leagueId) {
      return { ok: false, message: "Set FPL_LEAGUE_ID first." };
    }
    const db = await requireDb();
    const dbState = await getLeagueDbStateFresh();
    if (dbState.managers.length === 0) {
      return {
        ok: false,
        message: "No managers in the database. Sync or add managers first.",
      };
    }

    const [standings, bootstrap] = await Promise.all([
      fetchAllClassicLeagueStandings(leagueId),
      fetchBootstrapStatic(),
    ]);

    const roster = leagueRosterRows(standings);
    const histories = new Map<
      number,
      Awaited<ReturnType<typeof fetchManagerHistory>>
    >();
    await Promise.all(
      roster.map(async (row) => {
        try {
          histories.set(row.entry, await fetchManagerHistory(row.entry));
        } catch {
          /* skip */
        }
      }),
    );

    const weeks = buildWeeklyGameweeks(
      roster,
      bootstrap,
      histories,
      dbState.weekly,
    );
    const seasonComplete = bootstrap.events.every((event) => event.finished);
    const computed = computeBalancesForManagers({
      managers: dbState.managers,
      results: roster,
      prize: dbState.prize,
      weeks,
      seasonComplete,
    });

    for (const row of computed) {
      const [existing] = await db
        .select({ id: balances.id })
        .from(balances)
        .where(eq(balances.managerId, row.managerId))
        .limit(1);

      const amount = row.balance.toFixed(2);
      if (existing) {
        await db
          .update(balances)
          .set({ currentBalance: amount, updatedAt: new Date() })
          .where(eq(balances.id, existing.id));
      } else {
        await db.insert(balances).values({
          managerId: row.managerId,
          currentBalance: amount,
          entryFeePaid: row.entryFeePaid,
        });
      }
    }

    revalidateLeaguePaths();
    return {
      ok: true,
      message: `Recalculated balances for ${computed.length} managers.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't recalculate balances.",
    };
  }
}

export async function getPrizeAdminData(): Promise<{
  config: PrizeConfigFormValues;
  managerCount: number;
}> {
  await requireAdmin();
  const db = await requireDb();
  const [row] = await db.select().from(prizeConfig).limit(1);
  // Pot = entry fee × current-season managers (FPL-linked), not historical imports.
  const [totals] = await db
    .select({ value: count() })
    .from(managers)
    .where(isNotNull(managers.fplEntryId));

  return {
    config: row
      ? {
          entryFee: row.entryFee,
          weeklyWinner: row.weeklyWinner,
          overall1st: row.overall1st,
          overall2nd: row.overall2nd,
          lastPlace: row.lastPlace,
          customPrizes: parseCustomPrizes(row.customPrizes),
          currency: row.currency || DEFAULT_CURRENCY,
        }
      : EMPTY_PRIZE_CONFIG,
    managerCount: totals?.value ?? 0,
  };
}

export async function savePrizeConfig(
  _prev: PrizeFormState,
  formData: FormData,
): Promise<PrizeFormState> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const customPrizes = parseCustomPrizes(formData.get("customPrizes"));
    const payload = {
      entryFee: moneyToDb(formData.get("entryFee")),
      weeklyWinner: moneyToDb(formData.get("weeklyWinner")),
      overall1st: moneyToDb(formData.get("overall1st")),
      overall2nd: moneyToDb(formData.get("overall2nd")),
      lastPlace: moneyToDb(formData.get("lastPlace")),
      customPrizes,
      currency:
        String(formData.get("currency") ?? DEFAULT_CURRENCY)
          .trim()
          .toUpperCase() || DEFAULT_CURRENCY,
      updatedAt: new Date(),
    };

    const db = await requireDb();
    const [existing] = await db
      .select({ id: prizeConfig.id })
      .from(prizeConfig)
      .limit(1);

    if (existing) {
      await db
        .update(prizeConfig)
        .set(payload)
        .where(eq(prizeConfig.id, existing.id));
    } else {
      await db.insert(prizeConfig).values(payload);
    }

    revalidateLeaguePaths();
    return { ok: true, message: "Prize structure saved." };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : "Couldn't save prize config.",
    };
  }
}

export async function importHistoricalData(
  formData: FormData,
): Promise<ImportHistoricalResult> {
  const denied = await requireAdminAction();
  if (denied) {
    return { ...denied, seasons: [], warnings: [] };
  }
  try {
    await requireDb();
    const filePath = String(formData.get("filePath") ?? "").trim();
    const result = await importHistoricalFromPath(filePath);
    if (result.ok) {
      revalidateLeaguePaths();
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't import historical data.",
      seasons: [],
      warnings: [],
    };
  }
}

export async function getActivityAdminData() {
  await requireAdmin();
  await requireDb();
  const managersList = await listLeagueManagersForActivity();
  const events = await listRecentActivityEvents(50);
  const prizeDisplay = await getActivityPrizeDisplay();
  return {
    managers: managersList,
    events,
    prizeDisplay,
  };
}

export async function adjustActivityPoints(
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    await requireDb();
    const managerId = Number(formData.get("managerId"));
    const delta = Number(formData.get("delta"));
    const reason = String(formData.get("reason") ?? "").trim();

    const result = await awardActivityPoints({
      managerId,
      delta,
      reason,
      actionKey: ACTIVITY_ACTIONS.MANUAL,
    });

    revalidateLeaguePaths();
    return {
      ok: true,
      message: `Updated points (${delta > 0 ? "+" : ""}${delta}). New total: ${result.activityPoints}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't update activity points.",
    };
  }
}

export async function saveActivityPrize(
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    await requireDb();
    const display = String(formData.get("prizeDisplay") ?? "").trim();
    const saved = await setActivityPrizeDisplay(display);
    revalidateLeaguePaths();
    return {
      ok: true,
      message: `Activity prize set to “${saved}”.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't save activity prize.",
    };
  }
}
