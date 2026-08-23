import "server-only";

import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb, chatMessages, settings } from "@/lib/db";
import { getCurrentGameweek } from "@/lib/fpl";
import { pickQuoteOfWeek, shouldKeepOnRollover } from "@/lib/chat/helpers";
import { CHAT_ACTIVE_GW_SETTING } from "@/lib/chat/types";

const ROLLOVER_TTL_MS = 30_000;
let rolloverCache: { gameweek: number; at: number } | null = null;

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
  rolloverCache = { gameweek, at: Date.now() };
}

export async function peekChatGameweek(): Promise<number> {
  if (rolloverCache && Date.now() - rolloverCache.at < ROLLOVER_TTL_MS) {
    return rolloverCache.gameweek;
  }
  const stored = await getStoredActiveGameweek().catch(() => null);
  const gameweek = stored ?? 1;
  rolloverCache = { gameweek, at: Date.now() };
  return gameweek;
}

/**
 * Promote high-reaction / pinned messages to Hall of Fame, pick Quote of the Week,
 * and soft-delete the rest for a finished gameweek.
 */
export async function archiveChatGameweek(gameweek: number) {
  if (!Number.isInteger(gameweek) || gameweek <= 0) return;
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
  for (const row of candidates) {
    if (
      shouldKeepOnRollover({
        reactionCount: row.reactionCount,
        pinned: row.pinnedAt != null,
      })
    ) {
      keepIds.push(row.id);
    }
  }

  const quoteId = pickQuoteOfWeek(
    candidates.map((row) => ({
      id: row.id,
      reactionCount: row.reactionCount,
      pinned: row.pinnedAt != null,
    })),
  );
  if (quoteId != null && !keepIds.includes(quoteId)) keepIds.push(quoteId);

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
 * Safe to call on chat writes; incremental reads should peek the cached GW.
 */
export async function ensureChatGameweekRollover(): Promise<number> {
  if (rolloverCache && Date.now() - rolloverCache.at < ROLLOVER_TTL_MS) {
    return rolloverCache.gameweek;
  }

  try {
    const current = await getCurrentGameweek();
    if (current == null || current <= 0) {
      return peekChatGameweek();
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
          // Episode generation is best-effort.
        }
      }
      await setStoredActiveGameweek(current);
    } else {
      rolloverCache = { gameweek: current, at: Date.now() };
    }

    return current;
  } catch (error) {
    console.error("[chat] rollover skipped", error);
    return peekChatGameweek();
  }
}

/** Force archive of a specific GW (admin / tests). */
export async function forceArchiveGameweek(gameweek: number) {
  await archiveChatGameweek(gameweek);
  const stored = await getStoredActiveGameweek();
  if (stored != null && gameweek >= stored) {
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

/** Soft-delete leftover non-HOF messages older than the active GW. */
export async function purgeStaleActiveMessages(activeGameweek: number) {
  if (!Number.isInteger(activeGameweek) || activeGameweek <= 1) return;
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
