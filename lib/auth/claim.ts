import "server-only";

import { eq, isNotNull } from "drizzle-orm";
import { getDb, balances, managerAccounts, managers } from "@/lib/db";
import {
  fetchAllClassicLeagueStandings,
  getBootstrapStatic,
  getLeagueId,
  leagueRosterRows,
} from "@/lib/fpl";
import {
  matchLeagueRoster,
  parseClaimFormInput,
  validateClaimInputs,
  type LeagueRosterRow,
} from "@/lib/auth/claim-match";
import { getAuthUser } from "@/lib/auth/session";
import { defaultAvatarVariant, CLUB_DEFINITIONS } from "@/lib/avatars/clubs";
import {
  canonicalKeyFromName,
  preferredDisplayName,
} from "@/lib/history/names";
import { getLeagueDbStateFresh } from "@/lib/league/db";

async function loadLeagueRoster(): Promise<
  | { kind: "ok"; rows: LeagueRosterRow[] }
  | { kind: "unavailable"; message: string }
> {
  const leagueId = getLeagueId();
  if (!leagueId) {
    return {
      kind: "unavailable",
      message:
        "This app isn't linked to an FPL league yet. Ask an admin to set FPL_LEAGUE_ID.",
    };
  }

  try {
    const standings = await fetchAllClassicLeagueStandings(leagueId);
    const live = leagueRosterRows(standings);
    if (live.length === 0) {
      return {
        kind: "unavailable",
        message:
          "FPL hasn't published this league's managers yet. Try again in a minute.",
      };
    }

    const db = getDb();
    const stored = await db
      .select({
        fplEntryId: managers.fplEntryId,
        displayName: managers.displayName,
        name: managers.name,
      })
      .from(managers)
      .where(isNotNull(managers.fplEntryId));

    const alts = new Map<number, string[]>();
    for (const row of stored) {
      if (row.fplEntryId == null) continue;
      const names = [row.displayName, row.name].filter(Boolean);
      alts.set(row.fplEntryId, names);
    }

    return {
      kind: "ok",
      rows: live.map((row) => ({
        entryId: row.entry,
        playerName: row.player_name,
        teamName: row.entry_name,
        altNames: alts.get(row.entry) ?? [],
      })),
    };
  } catch (error) {
    console.error("[claim] League standings unavailable", error);
    return {
      kind: "unavailable",
      message:
        "Couldn't load the FPL league right now. Wait a minute and try again.",
    };
  }
}

async function fallbackRosterFromDb(): Promise<LeagueRosterRow[]> {
  const db = getDb();
  const stored = await db
    .select({
      fplEntryId: managers.fplEntryId,
      displayName: managers.displayName,
      name: managers.name,
    })
    .from(managers)
    .where(isNotNull(managers.fplEntryId));

  return stored.flatMap((row) =>
    row.fplEntryId == null
      ? []
      : [
          {
            entryId: row.fplEntryId,
            playerName: row.displayName,
            teamName: "",
            altNames: [row.name],
          },
        ],
  );
}

/** Find or create the DB manager row for a verified FPL league entry. */
async function ensureManagerForEntry(row: LeagueRosterRow): Promise<{
  id: number;
  displayName: string;
  fplEntryId: number;
}> {
  const db = getDb();
  const display = preferredDisplayName(
    row.playerName,
    canonicalKeyFromName(row.playerName),
  );
  const key = canonicalKeyFromName(row.playerName) || `entry_${row.entryId}`;

  const [byEntry] = await db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      fplEntryId: managers.fplEntryId,
    })
    .from(managers)
    .where(eq(managers.fplEntryId, row.entryId))
    .limit(1);

  if (byEntry && byEntry.fplEntryId != null) {
    return {
      id: byEntry.id,
      displayName: byEntry.displayName,
      fplEntryId: byEntry.fplEntryId,
    };
  }

  const [byKey] = await db
    .select({
      id: managers.id,
      displayName: managers.displayName,
    })
    .from(managers)
    .where(eq(managers.canonicalKey, key))
    .limit(1);

  if (byKey) {
    await db
      .update(managers)
      .set({
        fplEntryId: row.entryId,
        name: display,
        displayName: byKey.displayName || display,
      })
      .where(eq(managers.id, byKey.id));
    return {
      id: byKey.id,
      displayName: byKey.displayName || display,
      fplEntryId: row.entryId,
    };
  }

  const [inserted] = await db
    .insert(managers)
    .values({
      fplEntryId: row.entryId,
      canonicalKey: key,
      name: display,
      displayName: display,
    })
    .returning({ id: managers.id, displayName: managers.displayName });

  if (!inserted) {
    throw new Error("Couldn't create a manager row for that FPL entry.");
  }

  try {
    const fee = (await getLeagueDbStateFresh()).prize.entryFeeNum;
    await db.insert(balances).values({
      managerId: inserted.id,
      currentBalance: (-fee).toFixed(2),
      entryFeePaid: false,
    });
  } catch (error) {
    console.error("[claim] Balance insert failed", error);
  }

  return {
    id: inserted.id,
    displayName: inserted.displayName,
    fplEntryId: row.entryId,
  };
}

/**
 * Match a league manager against live FPL standings (name and/or team).
 */
export async function findManagerForClaim(args: {
  fullName: string;
  teamName: string;
  entryIdRaw?: string;
}): Promise<
  | {
      kind: "ok";
      managerId: number;
      displayName: string;
      teamName: string;
      fplEntryId: number;
    }
  | { kind: "error"; message: string }
> {
  const input = parseClaimFormInput({
    fullName: args.fullName,
    teamName: args.teamName,
    entryIdRaw: args.entryIdRaw ?? "",
  });
  const inputError = validateClaimInputs(input);
  if (inputError) {
    return { kind: "error", message: inputError };
  }

  const live = await loadLeagueRoster();
  let roster: LeagueRosterRow[] = [];
  if (live.kind === "ok") {
    roster = live.rows;
  } else if (input.entryId != null || input.fullName) {
    roster = await fallbackRosterFromDb();
    if (roster.length === 0) {
      return { kind: "error", message: live.message };
    }
    if (input.teamName && input.entryId == null) {
      return {
        kind: "error",
        message: `${live.message} Team names can't be checked until FPL loads — try your manager name, or paste your FPL entry ID.`,
      };
    }
  } else {
    return { kind: "error", message: live.message };
  }

  const matched = matchLeagueRoster(roster, input);
  if (matched.kind === "error") {
    return matched;
  }

  const db = getDb();
  let manager: { id: number; displayName: string; fplEntryId: number };
  try {
    manager = await ensureManagerForEntry(matched.row);
  } catch (error) {
    console.error("[claim] ensureManager failed", error);
    return {
      kind: "error",
      message: "Matched your FPL team, but couldn't save it. Try again.",
    };
  }

  const [claimed] = await db
    .select({ id: managerAccounts.id })
    .from(managerAccounts)
    .where(eq(managerAccounts.managerId, manager.id))
    .limit(1);

  if (claimed) {
    return {
      kind: "error",
      message:
        "That manager is already linked to another account. Ask an admin to unlink it if it's yours.",
    };
  }

  return {
    kind: "ok",
    managerId: manager.id,
    displayName: manager.displayName,
    teamName: matched.row.teamName || input.teamName,
    fplEntryId: manager.fplEntryId,
  };
}

export async function claimManagerForCurrentUser(args: {
  fullName: string;
  teamName: string;
  entryIdRaw?: string;
  supportedTeamId: number;
  avatarVariant?: number;
}): Promise<
  | { ok: true; displayName: string; managerId: number; fplEntryId: number }
  | { ok: false; message: string }
> {
  const user = await getAuthUser();
  if (!user?.email) {
    return { ok: false, message: "Sign in first, then verify your manager." };
  }

  if (!Number.isInteger(args.supportedTeamId) || args.supportedTeamId <= 0) {
    return { ok: false, message: "Pick the Premier League club you support." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ managerId: managerAccounts.managerId })
    .from(managerAccounts)
    .where(eq(managerAccounts.userId, user.id))
    .limit(1);

  if (existing) {
    return {
      ok: false,
      message: "Your account is already linked to a manager.",
    };
  }

  const found = await findManagerForClaim(args);
  if (found.kind === "error") {
    return { ok: false, message: found.message };
  }

  const variant =
    args.avatarVariant != null && Number.isInteger(args.avatarVariant)
      ? ((args.avatarVariant % 8) + 8) % 8
      : defaultAvatarVariant(found.managerId, args.supportedTeamId);

  let teamCode =
    CLUB_DEFINITIONS.find((c) => c.id === args.supportedTeamId)?.code ?? null;
  try {
    const bootstrap = await getBootstrapStatic();
    const live = bootstrap.teams.find((t) => t.id === args.supportedTeamId);
    if (live) teamCode = live.code;
  } catch {
    // keep static code
  }
  if (teamCode == null) {
    return { ok: false, message: "Unknown Premier League club." };
  }

  try {
    await db.insert(managerAccounts).values({
      userId: user.id,
      managerId: found.managerId,
      email: user.email.toLowerCase(),
    });
  } catch (error) {
    console.error("[claim] Link insert failed", error);
    return {
      ok: false,
      message: "Couldn't link that manager — it may already be claimed.",
    };
  }

  try {
    await db
      .update(managers)
      .set({
        fplEntryId: found.fplEntryId,
        supportedTeamId: args.supportedTeamId,
        supportedTeamCode: teamCode,
        avatarVariant: variant,
      })
      .where(eq(managers.id, found.managerId));
  } catch (error) {
    console.error("[claim] Avatar update failed after link", error);
  }

  return {
    ok: true,
    displayName: found.displayName,
    managerId: found.managerId,
    fplEntryId: found.fplEntryId,
  };
}
