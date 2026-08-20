import "server-only";

import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb, chatMessages, settings } from "@/lib/db";
import { getCurrentGameweek } from "@/lib/fpl";
import {
  CHAT_ACTIVE_GW_SETTING,
  HALL_OF_FAME_MIN_REACTIONS,
} from "@/lib/chat/types";

async function getStoredActiveGameweek(): Promise<number | null> {
  const db = getDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, CHAT_ACTIVE_GW_SETTING))
    .limit(1);
  if (!row) return null;
  const n = Number(row.value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function setStoredActiveGameweek(gameweek: number) {
  const db = getDb();
  await db
    .insert(settings)
    .values({ key: CHAT_ACTIVE_GW_SETTING, value: String(gameweek) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: String(gameweek) },
    });
}

/**
 * Promote high-reaction / pinned messages to Hall of Fame, pick Quote of the Week,
 * and soft-delete the rest for a finished gameweek.
 */
export async function archiveChatGameweek(gameweek: number) {
  const db = getDb();

  const candidates = await db
    .select({
      id: chatMessages.id,
      reactionCount: chatMessages.reactionCount,
      pinnedAt: chatMessages.pinnedAt,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.gameweek, gameweek),
        isNull(chatMessages.deletedAt),
        eq(chatMessages.isHallOfFame, false),
      ),
    )
    .orderBy(asc(chatMessages.id));

  if (candidates.length === 0) return;

  const keepIds: number[] = [];
  let quoteId: number | null = null;
  let quoteScore = -1;

  for (const row of candidates) {
    const pinned = row.pinnedAt != null;
    const keep =
      pinned || row.reactionCount >= HALL_OF_FAME_MIN_REACTIONS;
    if (keep) keepIds.push(row.id);

    const score = row.reactionCount + (pinned ? 0.5 : 0);
    if (score > quoteScore) {
      quoteScore = score;
      quoteId = row.id;
    }
  }

  if (quoteId != null && quoteScore >= 1) {
    if (!keepIds.includes(quoteId)) keepIds.push(quoteId);
  } else {
    quoteId = null;
  }

  if (keepIds.length > 0) {
    await db
      .update(chatMessages)
      .set({ isHallOfFame: true })
      .where(inArray(chatMessages.id, keepIds));

    if (quoteId != null) {
      await db
        .update(chatMessages)
        .set({ isQuoteOfWeek: false })
        .where(
          and(
            eq(chatMessages.gameweek, gameweek),
            eq(chatMessages.isQuoteOfWeek, true),
          ),
        );
      await db
        .update(chatMessages)
        .set({ isQuoteOfWeek: true, isHallOfFame: true })
        .where(eq(chatMessages.id, quoteId));
    }
  }

  await db
    .update(chatMessages)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(chatMessages.gameweek, gameweek),
        isNull(chatMessages.deletedAt),
        eq(chatMessages.isHallOfFame, false),
      ),
    );
}

/**
 * When FPL advances to a new gameweek, archive previous active chat weeks.
 * Safe to call on every chat read/write.
 */
export async function ensureChatGameweekRollover(): Promise<number> {
  const current = await getCurrentGameweek();
  if (current == null || current <= 0) {
    const stored = await getStoredActiveGameweek();
    return stored ?? 1;
  }

  const stored = await getStoredActiveGameweek();
  if (stored == null) {
    await setStoredActiveGameweek(current);
    return current;
  }

  if (current > stored) {
    for (let gw = stored; gw < current; gw += 1) {
      await archiveChatGameweek(gw);
      try {
        const { generateWeeklyDocumentaryEpisode } = await import(
          "@/lib/documentary/service"
        );
        await generateWeeklyDocumentaryEpisode(gw);
      } catch {
        // Episode generation is best-effort; ensureDocumentaryEpisodes retries.
      }
    }
    await setStoredActiveGameweek(current);
  }

  return current;
}

/** Force archive of a specific GW (admin / tests). */
export async function forceArchiveGameweek(gameweek: number) {
  await archiveChatGameweek(gameweek);
  const db = getDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, CHAT_ACTIVE_GW_SETTING))
    .limit(1);
  const active = row ? Number(row.value) : null;
  if (active != null && gameweek >= active) {
    await setStoredActiveGameweek(gameweek + 1);
  }
}

export async function recountReactions(messageId: number) {
  const db = getDb();
  await db
    .update(chatMessages)
    .set({
      reactionCount: sql`(
        SELECT COUNT(*)::int FROM chat_reactions
        WHERE chat_reactions.message_id = ${messageId}
      )`,
    })
    .where(eq(chatMessages.id, messageId));
}

/** Soft-delete any leftover non-HOF messages older than the active GW (safety net). */
export async function purgeStaleActiveMessages(activeGameweek: number) {
  const db = getDb();
  await db
    .update(chatMessages)
    .set({ deletedAt: new Date() })
    .where(
      and(
        lt(chatMessages.gameweek, activeGameweek),
        isNull(chatMessages.deletedAt),
        eq(chatMessages.isHallOfFame, false),
      ),
    );
}
