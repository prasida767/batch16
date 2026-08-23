import "server-only";

import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { awardActivityPoints } from "@/lib/activity";
import { ACTIVITY_ACTIONS } from "@/lib/activity/types";
import { getAuthStatus } from "@/lib/auth/session";
import {
  ensureChatGameweekRollover,
  peekChatGameweek,
  purgeStaleActiveMessages,
  recountReactions,
} from "@/lib/chat/rollover";
import {
  CHAT_BODY_MAX,
  CHAT_POST_ACTIVITY,
  REACTION_EMOJIS,
  type ChatMessageView,
  type ChatReactionSummary,
  type DocumentaryEpisode,
  type QuoteOfWeek,
  type ReactionEmoji,
} from "@/lib/chat/types";
import { requireActingLeagueManager } from "@/lib/challenges/identity";
import {
  getDb,
  chatMessages,
  chatReactions,
  managers,
} from "@/lib/db";

function isAllowedEmoji(emoji: string): emoji is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(emoji);
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

async function loadReactionsForMessages(
  messageIds: number[],
  viewerId: number | null,
): Promise<Map<number, ChatReactionSummary[]>> {
  if (messageIds.length === 0) return new Map();

  const db = getDb();
  const reactedExpr =
    viewerId != null
      ? sql<boolean>`bool_or(${chatReactions.managerId} = ${viewerId})`
      : sql<boolean>`false`;
  const rows = await db
    .select({
      messageId: chatReactions.messageId,
      emoji: chatReactions.emoji,
      count: sql<number>`count(*)::int`,
      reactedByMe: reactedExpr,
    })
    .from(chatReactions)
    .where(inArray(chatReactions.messageId, messageIds))
    .groupBy(chatReactions.messageId, chatReactions.emoji);

  const grouped = new Map<number, ChatReactionSummary[]>();
  for (const row of rows) {
    if (!isAllowedEmoji(row.emoji)) continue;
    const list = grouped.get(row.messageId) ?? [];
    list.push({
      emoji: row.emoji,
      count: Number(row.count) || 0,
      reactedByMe: Boolean(row.reactedByMe),
    });
    grouped.set(row.messageId, list);
  }

  for (const [messageId, summaries] of grouped) {
    summaries.sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
    grouped.set(messageId, summaries);
  }

  return grouped;
}

async function hydrateMessages(
  rows: {
    id: number;
    managerId: number;
    managerName: string;
    avatarUrl: string | null;
    supportedTeamId: number | null;
    supportedTeamCode: number | null;
    avatarVariant: number;
    body: string;
    gameweek: number;
    replyToId: number | null;
    pinnedAt: Date | null;
    isHallOfFame: boolean;
    isQuoteOfWeek: boolean;
    reactionCount: number;
    createdAt: Date;
  }[],
  viewerId: number | null,
): Promise<ChatMessageView[]> {
  if (rows.length === 0) return [];

  const replyIds = [
    ...new Set(
      rows
        .map((r) => r.replyToId)
        .filter((id): id is number => id != null && id > 0),
    ),
  ];

  const db = getDb();
  const replyMap = new Map<
    number,
    { id: number; managerName: string; body: string }
  >();

  if (replyIds.length > 0) {
    const replyRows = await db
      .select({
        id: chatMessages.id,
        body: chatMessages.body,
        managerName: managers.displayName,
        deletedAt: chatMessages.deletedAt,
      })
      .from(chatMessages)
      .innerJoin(managers, eq(chatMessages.managerId, managers.id))
      .where(inArray(chatMessages.id, replyIds));

    for (const r of replyRows) {
      replyMap.set(r.id, {
        id: r.id,
        managerName: r.managerName,
        body: r.deletedAt ? "[deleted]" : r.body,
      });
    }
  }

  const reactions = await loadReactionsForMessages(
    rows.map((r) => r.id),
    viewerId,
  );

  return rows.map((row) => ({
    id: row.id,
    managerId: row.managerId,
    managerName: row.managerName,
    avatarUrl: row.avatarUrl,
    supportedTeamId: row.supportedTeamId,
    supportedTeamCode: row.supportedTeamCode,
    avatarVariant: row.avatarVariant,
    body: row.body,
    gameweek: row.gameweek,
    replyToId: row.replyToId,
    replyPreview: row.replyToId ? (replyMap.get(row.replyToId) ?? null) : null,
    pinned: row.pinnedAt != null,
    isHallOfFame: row.isHallOfFame,
    isQuoteOfWeek: row.isQuoteOfWeek,
    reactionCount: row.reactionCount,
    reactions: reactions.get(row.id) ?? [],
    createdAt: toIso(row.createdAt),
  }));
}

const messageSelect = {
  id: chatMessages.id,
  managerId: chatMessages.managerId,
  managerName: managers.displayName,
  avatarUrl: managers.avatarUrl,
  supportedTeamId: managers.supportedTeamId,
  supportedTeamCode: managers.supportedTeamCode,
  avatarVariant: managers.avatarVariant,
  body: chatMessages.body,
  gameweek: chatMessages.gameweek,
  replyToId: chatMessages.replyToId,
  pinnedAt: chatMessages.pinnedAt,
  isHallOfFame: chatMessages.isHallOfFame,
  isQuoteOfWeek: chatMessages.isQuoteOfWeek,
  reactionCount: chatMessages.reactionCount,
  createdAt: chatMessages.createdAt,
};

export async function listActiveChatMessages(options?: {
  limit?: number;
  afterId?: number;
  viewerId?: number | null;
  skipMaintenance?: boolean;
}): Promise<{ messages: ChatMessageView[]; gameweek: number }> {
  const skipMaintenance = Boolean(options?.skipMaintenance);
  let gameweek = 1;
  try {
    gameweek = skipMaintenance
      ? await peekChatGameweek()
      : await ensureChatGameweekRollover();
    if (!skipMaintenance) {
      await purgeStaleActiveMessages(gameweek);
    }
  } catch (error) {
    console.error("[chat] list maintenance skipped", error);
    gameweek = await peekChatGameweek().catch(() => 1);
  }

  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200);
  const afterId = options?.afterId;
  const viewerId = options?.viewerId ?? null;
  const db = getDb();

  const filters = [
    eq(chatMessages.gameweek, gameweek),
    isNull(chatMessages.deletedAt),
    eq(chatMessages.isHallOfFame, false),
  ];
  if (afterId != null && Number.isInteger(afterId) && afterId > 0) {
    filters.push(gt(chatMessages.id, afterId));
  }

  const rows = await db
    .select(messageSelect)
    .from(chatMessages)
    .innerJoin(managers, eq(chatMessages.managerId, managers.id))
    .where(and(...filters))
    .orderBy(
      afterId ? asc(chatMessages.id) : desc(chatMessages.createdAt),
    )
    .limit(limit);

  const ordered = afterId ? rows : [...rows].reverse();
  const messages = await hydrateMessages(ordered, viewerId);
  return { messages, gameweek };
}

export async function listPinnedMessages(
  gameweek: number,
  viewerId: number | null,
): Promise<ChatMessageView[]> {
  const db = getDb();
  const rows = await db
    .select(messageSelect)
    .from(chatMessages)
    .innerJoin(managers, eq(chatMessages.managerId, managers.id))
    .where(
      and(
        eq(chatMessages.gameweek, gameweek),
        isNull(chatMessages.deletedAt),
        eq(chatMessages.isHallOfFame, false),
        isNotNull(chatMessages.pinnedAt),
      ),
    )
    .orderBy(desc(chatMessages.pinnedAt));

  return hydrateMessages(rows, viewerId);
}

export async function getChatMessageById(
  id: number,
  viewerId: number | null,
): Promise<ChatMessageView | null> {
  const db = getDb();
  const [row] = await db
    .select(messageSelect)
    .from(chatMessages)
    .innerJoin(managers, eq(chatMessages.managerId, managers.id))
    .where(and(eq(chatMessages.id, id), isNull(chatMessages.deletedAt)))
    .limit(1);
  if (!row) return null;
  const [view] = await hydrateMessages([row], viewerId);
  return view ?? null;
}

export async function sendChatMessage(input: {
  managerId: number;
  body: string;
  replyToId?: number | null;
}): Promise<ChatMessageView> {
  const { sanitizeUserText } = await import("@/lib/security/sanitize");
  const { checkRateLimit, RATE_LIMITS } = await import(
    "@/lib/security/rate-limit"
  );
  const body = sanitizeUserText(input.body, CHAT_BODY_MAX);
  if (body.length < 1 || body.length > CHAT_BODY_MAX) {
    throw new Error(`Message must be 1–${CHAT_BODY_MAX} characters.`);
  }

  const replyToId =
    Number.isInteger(input.replyToId) && (input.replyToId as number) > 0
      ? input.replyToId
      : null;

  await requireActingLeagueManager(input.managerId);

  const limited = checkRateLimit(
    `chat:${input.managerId}`,
    RATE_LIMITS.chatPost.limit,
    RATE_LIMITS.chatPost.windowMs,
  );
  if (!limited.ok) {
    throw new Error(
      `Slow down — try again in ${limited.retryAfterSec}s.`,
    );
  }

  const gameweek = await peekChatGameweek();
  const db = getDb();

  if (replyToId) {
    const [parent] = await db
      .select({
        id: chatMessages.id,
        deletedAt: chatMessages.deletedAt,
        gameweek: chatMessages.gameweek,
        isHallOfFame: chatMessages.isHallOfFame,
      })
      .from(chatMessages)
      .where(eq(chatMessages.id, replyToId))
      .limit(1);
    if (
      !parent ||
      parent.deletedAt ||
      parent.isHallOfFame ||
      parent.gameweek !== gameweek
    ) {
      throw new Error("Reply target not found in this week's chat.");
    }
  }

  const [inserted] = await db
    .insert(chatMessages)
    .values({
      managerId: input.managerId,
      body,
      replyToId,
      gameweek,
    })
    .returning({ id: chatMessages.id });

  if (!inserted?.id) {
    throw new Error("Couldn't send message.");
  }

  try {
    await awardActivityPoints({
      managerId: input.managerId,
      delta: CHAT_POST_ACTIVITY,
      reason: replyToId
        ? `Replied in the Dressing Room (#${inserted.id})`
        : `Posted in the Dressing Room (#${inserted.id})`,
      actionKey: ACTIVITY_ACTIONS.WALL_POST,
    });
  } catch (error) {
    console.error("[chat] activity points skipped", error);
  }

  const view = await getChatMessageById(inserted.id, input.managerId);
  if (!view) throw new Error("Couldn't load sent message.");

  try {
    const {
      createNotification,
      listManagersForMentions,
      resolveMentionedManagerIds,
      NOTIFICATION_TYPES,
    } = await import("@/lib/notifications");

    if (replyToId) {
      const [parent] = await db
        .select({
          managerId: chatMessages.managerId,
        })
        .from(chatMessages)
        .where(eq(chatMessages.id, replyToId))
        .limit(1);
      if (parent && parent.managerId !== input.managerId) {
        await createNotification({
          recipientManagerId: parent.managerId,
          actorManagerId: input.managerId,
          type: NOTIFICATION_TYPES.CHAT_REPLY,
          title: "New reply in Dressing Room",
          body: body.slice(0, 120),
          href: "/dressing-room",
          meta: { messageId: inserted.id, replyToId },
        });
      }
    }

    const roster = await listManagersForMentions();
    const mentioned = resolveMentionedManagerIds(
      body,
      roster,
      input.managerId,
    );
    for (const recipientManagerId of mentioned) {
      await createNotification({
        recipientManagerId,
        actorManagerId: input.managerId,
        type: NOTIFICATION_TYPES.CHAT_MENTION,
        title: "You were mentioned",
        body: body.slice(0, 120),
        href: "/dressing-room",
        meta: { messageId: inserted.id },
      });
    }
  } catch (error) {
    console.error("[chat] notifications skipped", error);
  }

  return view;
}

export async function toggleChatReaction(input: {
  managerId: number;
  messageId: number;
  emoji: string;
}): Promise<ChatMessageView> {
  if (!isAllowedEmoji(input.emoji)) {
    throw new Error("That reaction isn't allowed.");
  }
  await requireActingLeagueManager(input.managerId);

  const db = getDb();
  const [message] = await db
    .select({
      id: chatMessages.id,
      deletedAt: chatMessages.deletedAt,
      isHallOfFame: chatMessages.isHallOfFame,
    })
    .from(chatMessages)
    .where(eq(chatMessages.id, input.messageId))
    .limit(1);

  if (!message || message.deletedAt) {
    throw new Error("Message not found.");
  }

  const [existing] = await db
    .select({ id: chatReactions.id })
    .from(chatReactions)
    .where(
      and(
        eq(chatReactions.messageId, input.messageId),
        eq(chatReactions.managerId, input.managerId),
        eq(chatReactions.emoji, input.emoji),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(chatReactions).where(eq(chatReactions.id, existing.id));
  } else {
    try {
      await db.insert(chatReactions).values({
        messageId: input.messageId,
        managerId: input.managerId,
        emoji: input.emoji,
      });
    } catch (error) {
      console.error("[chat] reaction insert skipped", error);
    }
  }

  await recountReactions(input.messageId);
  const view = await getChatMessageById(input.messageId, input.managerId);
  if (!view) throw new Error("Message not found.");
  return view;
}

export async function togglePinChatMessage(input: {
  messageId: number;
  adminManagerId: number | null;
}): Promise<ChatMessageView> {
  const auth = await getAuthStatus();
  if (!auth.isAdmin) {
    throw new Error("Only admins can pin messages.");
  }

  const db = getDb();
  const [message] = await db
    .select({
      id: chatMessages.id,
      deletedAt: chatMessages.deletedAt,
      pinnedAt: chatMessages.pinnedAt,
      isHallOfFame: chatMessages.isHallOfFame,
    })
    .from(chatMessages)
    .where(eq(chatMessages.id, input.messageId))
    .limit(1);

  if (!message || message.deletedAt || message.isHallOfFame) {
    throw new Error("Message not found in active chat.");
  }

  if (message.pinnedAt) {
    await db
      .update(chatMessages)
      .set({ pinnedAt: null, pinnedBy: null })
      .where(eq(chatMessages.id, input.messageId));
  } else {
    await db
      .update(chatMessages)
      .set({
        pinnedAt: new Date(),
        pinnedBy: input.adminManagerId,
      })
      .where(eq(chatMessages.id, input.messageId));
  }

  const view = await getChatMessageById(
    input.messageId,
    input.adminManagerId,
  );
  if (!view) throw new Error("Message not found.");
  return view;
}

function rowToQuote(row: {
  id: number;
  body: string;
  gameweek: number;
  reactionCount: number;
  createdAt: Date;
  managerId: number;
  managerName: string;
}): QuoteOfWeek {
  return {
    gameweek: row.gameweek,
    messageId: row.id,
    body: row.body,
    managerId: row.managerId,
    managerName: row.managerName,
    reactionCount: row.reactionCount,
    createdAt: toIso(row.createdAt),
  };
}

export async function getQuoteOfWeek(
  gameweek: number,
): Promise<QuoteOfWeek | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      gameweek: chatMessages.gameweek,
      reactionCount: chatMessages.reactionCount,
      createdAt: chatMessages.createdAt,
      managerId: chatMessages.managerId,
      managerName: managers.displayName,
    })
    .from(chatMessages)
    .innerJoin(managers, eq(chatMessages.managerId, managers.id))
    .where(
      and(
        eq(chatMessages.gameweek, gameweek),
        eq(chatMessages.isQuoteOfWeek, true),
      ),
    )
    .limit(1);

  return row ? rowToQuote(row) : null;
}

/** Live quote candidate for the current GW (max reactions so far). */
export async function getLiveQuoteCandidate(
  gameweek: number,
): Promise<QuoteOfWeek | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      gameweek: chatMessages.gameweek,
      reactionCount: chatMessages.reactionCount,
      createdAt: chatMessages.createdAt,
      managerId: chatMessages.managerId,
      managerName: managers.displayName,
    })
    .from(chatMessages)
    .innerJoin(managers, eq(chatMessages.managerId, managers.id))
    .where(
      and(
        eq(chatMessages.gameweek, gameweek),
        isNull(chatMessages.deletedAt),
        eq(chatMessages.isHallOfFame, false),
        sql`${chatMessages.reactionCount} > 0`,
      ),
    )
    .orderBy(desc(chatMessages.reactionCount), asc(chatMessages.id))
    .limit(1);

  return row ? rowToQuote(row) : null;
}

export async function listHallOfFame(limit = 40): Promise<QuoteOfWeek[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      gameweek: chatMessages.gameweek,
      reactionCount: chatMessages.reactionCount,
      createdAt: chatMessages.createdAt,
      managerId: chatMessages.managerId,
      managerName: managers.displayName,
    })
    .from(chatMessages)
    .innerJoin(managers, eq(chatMessages.managerId, managers.id))
    .where(eq(chatMessages.isHallOfFame, true))
    .orderBy(desc(chatMessages.gameweek), desc(chatMessages.reactionCount))
    .limit(limit);

  return rows.map(rowToQuote);
}

export async function listDocumentaryEpisodes(): Promise<DocumentaryEpisode[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      gameweek: chatMessages.gameweek,
      reactionCount: chatMessages.reactionCount,
      createdAt: chatMessages.createdAt,
      managerId: chatMessages.managerId,
      managerName: managers.displayName,
      isQuoteOfWeek: chatMessages.isQuoteOfWeek,
    })
    .from(chatMessages)
    .innerJoin(managers, eq(chatMessages.managerId, managers.id))
    .where(eq(chatMessages.isHallOfFame, true))
    .orderBy(desc(chatMessages.gameweek), desc(chatMessages.reactionCount));

  const byGw = new Map<number, DocumentaryEpisode>();
  for (const row of rows) {
    let ep = byGw.get(row.gameweek);
    if (!ep) {
      ep = { gameweek: row.gameweek, quote: null, hallOfFame: [] };
      byGw.set(row.gameweek, ep);
    }
    const quote = rowToQuote(row);
    ep.hallOfFame.push(quote);
    if (row.isQuoteOfWeek) {
      ep.quote = quote;
    }
  }

  for (const ep of byGw.values()) {
    if (!ep.quote && ep.hallOfFame.length > 0) {
      ep.quote = ep.hallOfFame[0]!;
    }
  }

  return [...byGw.values()].sort((a, b) => b.gameweek - a.gameweek);
}
