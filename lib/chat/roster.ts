import "server-only";

import { asc, eq, isNotNull } from "drizzle-orm";
import { getDb, managerAccounts, managers } from "@/lib/db";
import type { ChatRosterSeat } from "@/lib/chat/types";

export type { ChatRosterSeat };

/** FPL-linked managers for Dressing Room seating. */
export async function listChatRoster(): Promise<ChatRosterSeat[]> {
  const db = getDb();
  const rows = await db
    .select({
      managerId: managers.id,
      displayName: managers.displayName,
      avatarUrl: managers.avatarUrl,
      supportedTeamId: managers.supportedTeamId,
      supportedTeamCode: managers.supportedTeamCode,
      avatarVariant: managers.avatarVariant,
      accountUserId: managerAccounts.userId,
    })
    .from(managers)
    .leftJoin(managerAccounts, eq(managerAccounts.managerId, managers.id))
    .where(isNotNull(managers.fplEntryId))
    .orderBy(asc(managers.displayName));

  return rows.map((row) => ({
    managerId: row.managerId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    supportedTeamId: row.supportedTeamId,
    supportedTeamCode: row.supportedTeamCode,
    avatarVariant: row.avatarVariant,
    verified: Boolean(row.accountUserId),
  }));
}
