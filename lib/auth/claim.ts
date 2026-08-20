import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, managerAccounts, managers } from "@/lib/db";
import { fetchManagerEntry } from "@/lib/fpl";
import { canonicalKeyFromName } from "@/lib/history/names";
import {
  namesMatchForClaim,
  normalizeTeamName,
  validateClaimInputs,
} from "@/lib/auth/claim-match";
import { getAuthUser } from "@/lib/auth/session";
import { defaultAvatarVariant, CLUB_DEFINITIONS } from "@/lib/avatars/clubs";
import { getBootstrapStatic } from "@/lib/fpl";

/**
 * Match a league manager by real name + FPL team name (entry name).
 * Both must match; team name is checked against live FPL data.
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

  const key = canonicalKeyFromName(fullName)!;

  const db = getDb();
  let candidates = await db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      name: managers.name,
      canonicalKey: managers.canonicalKey,
      fplEntryId: managers.fplEntryId,
    })
    .from(managers)
    .where(and(eq(managers.canonicalKey, key), isNotNull(managers.fplEntryId)));

  if (candidates.length === 0) {
    const all = await db
      .select({
        id: managers.id,
        displayName: managers.displayName,
        name: managers.name,
        canonicalKey: managers.canonicalKey,
        fplEntryId: managers.fplEntryId,
      })
      .from(managers)
      .where(isNotNull(managers.fplEntryId));

    candidates = all.filter(
      (row) =>
        namesMatchForClaim(row.displayName, fullName) ||
        namesMatchForClaim(row.name, fullName),
    );
    if (candidates.length === 0) {
      return {
        kind: "error",
        message:
          "No league manager matched that name. Use the exact name from the standings.",
      };
    }
  }

  const teamKey = normalizeTeamName(teamName);
  const matches: {
    managerId: number;
    displayName: string;
    teamName: string;
  }[] = [];

  for (const candidate of candidates) {
    if (candidate.fplEntryId == null) continue;
    try {
      const entry = await fetchManagerEntry(candidate.fplEntryId);
      const fplPerson = `${entry.player_first_name} ${entry.player_last_name}`.trim();
      const personOk =
        namesMatchForClaim(candidate.displayName, fullName) ||
        namesMatchForClaim(candidate.name, fullName) ||
        namesMatchForClaim(fplPerson, fullName);
      const teamOk = normalizeTeamName(entry.name) === teamKey;
      if (personOk && teamOk) {
        matches.push({
          managerId: candidate.id,
          displayName: candidate.displayName,
          teamName: entry.name,
        });
      }
    } catch {
      // Skip unreachable FPL entries
    }
  }

  if (matches.length === 0) {
    return {
      kind: "error",
      message:
        "Name matched a manager, but the FPL team name didn't. Check the team name on FPL (not your login email).",
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
