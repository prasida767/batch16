import "server-only";

import { eq, isNotNull } from "drizzle-orm";
import { getDb, managerAccounts, managers } from "@/lib/db";
import {
  fetchAllClassicLeagueStandings,
  fetchManagerEntry,
  getBootstrapStatic,
  getLeagueId,
  leagueRosterRows,
} from "@/lib/fpl";
import {
  namesMatchForClaim,
  teamNamesMatch,
  validateClaimInputs,
} from "@/lib/auth/claim-match";
import { getAuthUser } from "@/lib/auth/session";
import { defaultAvatarVariant, CLUB_DEFINITIONS } from "@/lib/avatars/clubs";

type RosterHint = { playerName: string; teamName: string };

async function loadRosterByEntry(): Promise<Map<number, RosterHint>> {
  const leagueId = getLeagueId();
  if (!leagueId) return new Map();
  try {
    const standings = await fetchAllClassicLeagueStandings(leagueId);
    const map = new Map<number, RosterHint>();
    for (const row of leagueRosterRows(standings)) {
      map.set(row.entry, {
        playerName: row.player_name,
        teamName: row.entry_name,
      });
    }
    return map;
  } catch (error) {
    console.error("[claim] League standings unavailable", error);
    return new Map();
  }
}

/**
 * Match a league manager by real name + FPL team name (entry name).
 * Prefers classic-league standings (same data as the table) so a blocked
 * `/entry/{id}` fetch cannot reject a correct claim.
 */
export async function findManagerForClaim(args: {
  fullName: string;
  teamName: string;
}): Promise<
  | { kind: "ok"; managerId: number; displayName: string; teamName: string }
  | { kind: "error"; message: string }
> {
  const fullName = args.fullName.trim();
  const teamName = args.teamName.trim();
  const inputError = validateClaimInputs({ fullName, teamName });
  if (inputError) {
    return { kind: "error", message: inputError };
  }

  const db = getDb();
  const candidates = await db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      name: managers.name,
      fplEntryId: managers.fplEntryId,
    })
    .from(managers)
    .where(isNotNull(managers.fplEntryId));

  if (candidates.length === 0) {
    return {
      kind: "error",
      message:
        "No league manager matched that name. Use the exact name from the standings.",
    };
  }

  const roster = await loadRosterByEntry();
  const matches: {
    managerId: number;
    displayName: string;
    teamName: string;
  }[] = [];
  let nameHitCount = 0;
  let sawTeamData = false;

  for (const candidate of candidates) {
    if (candidate.fplEntryId == null) continue;
    const hint = roster.get(candidate.fplEntryId) ?? null;

    const personOk =
      namesMatchForClaim(candidate.displayName, fullName) ||
      namesMatchForClaim(candidate.name, fullName) ||
      (hint != null && namesMatchForClaim(hint.playerName, fullName));

    if (!personOk) continue;
    nameHitCount += 1;

    let resolvedTeam = hint?.teamName ?? null;
    if (resolvedTeam == null) {
      try {
        const entry = await fetchManagerEntry(candidate.fplEntryId);
        resolvedTeam = entry.name;
      } catch {
        // Entry endpoint is often blocked; standings / unique name still work.
      }
    }

    if (resolvedTeam) {
      sawTeamData = true;
      if (!teamNamesMatch(resolvedTeam, teamName)) continue;
    } else {
      continue;
    }

    matches.push({
      managerId: candidate.id,
      displayName: candidate.displayName,
      teamName: resolvedTeam,
    });
  }

  if (matches.length === 0 && nameHitCount === 1 && !sawTeamData) {
    const unique = candidates.find((candidate) => {
      if (candidate.fplEntryId == null) return false;
      return (
        namesMatchForClaim(candidate.displayName, fullName) ||
        namesMatchForClaim(candidate.name, fullName)
      );
    });
    if (unique) {
      matches.push({
        managerId: unique.id,
        displayName: unique.displayName,
        teamName,
      });
    }
  }

  if (matches.length === 0) {
    if (nameHitCount === 0) {
      return {
        kind: "error",
        message:
          "No league manager matched that name. Use the name from the standings (first and last).",
      };
    }
    return {
      kind: "error",
      message:
        "Name matched a manager, but the FPL team name didn't. Use the team name from the league table, not your email or club.",
    };
  }

  if (matches.length > 1) {
    return {
      kind: "error",
      message:
        "Multiple managers matched. Contact the admin to link your account.",
    };
  }

  const [match] = matches;
  const [claimed] = await db
    .select({ id: managerAccounts.id })
    .from(managerAccounts)
    .where(eq(managerAccounts.managerId, match!.managerId))
    .limit(1);

  if (claimed) {
    return {
      kind: "error",
      message: "That manager is already linked to another account.",
    };
  }

  return {
    kind: "ok",
    managerId: match!.managerId,
    displayName: match!.displayName,
    teamName: match!.teamName,
  };
}

export async function claimManagerForCurrentUser(args: {
  fullName: string;
  teamName: string;
  supportedTeamId: number;
  avatarVariant?: number;
}): Promise<{ ok: true; displayName: string } | { ok: false; message: string }> {
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
    await db
      .update(managers)
      .set({
        supportedTeamId: args.supportedTeamId,
        supportedTeamCode: teamCode,
        avatarVariant: variant,
      })
      .where(eq(managers.id, found.managerId));
  } catch {
    return {
      ok: false,
      message: "Couldn't link that manager — it may already be claimed.",
    };
  }

  return { ok: true, displayName: found.displayName };
}
