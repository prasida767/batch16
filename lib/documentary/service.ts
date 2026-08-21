import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { awardActivityPoints } from "@/lib/activity";
import { ACTIVITY_ACTIONS } from "@/lib/activity/types";
import { getQuoteOfWeek, listHallOfFame } from "@/lib/chat";
import { ensureChatGameweekRollover } from "@/lib/chat/rollover";
import {
  narrateSeasonFinale,
  narrateWeeklyEpisode,
} from "@/lib/documentary/narrative";
import {
  DOCUMENTARY_RATE_ACTIVITY,
  type DocumentaryEpisodeView,
  type DocumentaryShelf,
} from "@/lib/documentary/types";
import {
  getDb,
  chatMessages,
  documentaryEpisodes,
  documentaryRatings,
  managers,
} from "@/lib/db";
import { leagueRosterRows } from "@/lib/fpl";
import { getLeagueSnapshot } from "@/lib/league/queries";
import { buildWeeklyGameweeks } from "@/lib/league/weekly";
import { requireActingLeagueManager } from "@/lib/challenges/identity";
import { isDocumentaryWeekEligible } from "@/lib/documentary/eligibility";

export { isDocumentaryWeekEligible } from "@/lib/documentary/eligibility";

function toView(
  row: {
    id: number;
    kind: string;
    gameweek: number | null;
    title: string;
    biggestShock: string;
    worstDecision: string;
    dramaticOvertake: string;
    quoteMessageId: number | null;
    quoteBody: string | null;
    quoteManagerName: string | null;
    quoteReactionCount: number;
    cliffhanger: string;
    finaleSummary: string | null;
    ratingSum: number;
    ratingCount: number;
    generatedAt: Date;
  },
  myRating: number | null,
): DocumentaryEpisodeView {
  const quote =
    row.quoteBody && row.quoteManagerName
      ? {
          messageId: row.quoteMessageId,
          body: row.quoteBody,
          managerName: row.quoteManagerName,
          reactionCount: row.quoteReactionCount,
        }
      : null;

  return {
    id: row.id,
    kind: row.kind === "finale" ? "finale" : "weekly",
    gameweek: row.gameweek,
    title: row.title,
    biggestShock: row.biggestShock,
    worstDecision: row.worstDecision,
    dramaticOvertake: row.dramaticOvertake,
    quote,
    cliffhanger: row.cliffhanger,
    finaleSummary: row.finaleSummary,
    ratingAverage:
      row.ratingCount > 0 ? row.ratingSum / row.ratingCount : null,
    ratingCount: row.ratingCount,
    myRating,
    generatedAt:
      row.generatedAt instanceof Date
        ? row.generatedAt.toISOString()
        : String(row.generatedAt),
  };
}

/** Best chat line for a GW by reaction count (Quote of the Week source). */
export async function getBestChatQuoteForGameweek(gameweek: number) {
  const crowned = await getQuoteOfWeek(gameweek);
  if (crowned) {
    return {
      messageId: crowned.messageId,
      body: crowned.body,
      managerName: crowned.managerName,
      reactionCount: crowned.reactionCount,
    };
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      reactionCount: chatMessages.reactionCount,
      managerName: managers.displayName,
    })
    .from(chatMessages)
    .innerJoin(managers, eq(chatMessages.managerId, managers.id))
    .where(
      and(
        eq(chatMessages.gameweek, gameweek),
        sql`${chatMessages.reactionCount} > 0`,
      ),
    )
    .orderBy(desc(chatMessages.reactionCount), asc(chatMessages.id))
    .limit(1);

  if (!row) return null;
  return {
    messageId: row.id,
    body: row.body,
    managerName: row.managerName,
    reactionCount: row.reactionCount,
  };
}

async function loadMyRatings(
  episodeIds: number[],
  viewerId: number | null,
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!viewerId || episodeIds.length === 0) return map;
  const db = getDb();
  const rows = await db
    .select({
      episodeId: documentaryRatings.episodeId,
      stars: documentaryRatings.stars,
    })
    .from(documentaryRatings)
    .where(
      and(
        eq(documentaryRatings.managerId, viewerId),
        inArray(documentaryRatings.episodeId, episodeIds),
      ),
    );
  for (const row of rows) map.set(row.episodeId, row.stars);
  return map;
}

export async function listDocumentaryEpisodeViews(
  viewerId: number | null = null,
): Promise<DocumentaryEpisodeView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(documentaryEpisodes)
    .orderBy(
      sql`CASE WHEN ${documentaryEpisodes.kind} = 'finale' THEN 1 ELSE 0 END`,
      desc(documentaryEpisodes.gameweek),
      desc(documentaryEpisodes.generatedAt),
    );

  const myRatings = await loadMyRatings(
    rows.map((r) => r.id),
    viewerId,
  );

  return rows.map((row) => toView(row, myRatings.get(row.id) ?? null));
}

export async function getDocumentaryShelf(
  viewerId: number | null = null,
): Promise<DocumentaryShelf> {
  const episodes = await listDocumentaryEpisodeViews(viewerId);
  const finale = episodes.find((e) => e.kind === "finale") ?? null;
  const weekly = episodes.filter((e) => e.kind === "weekly");
  return {
    featured: weekly[0] ?? finale,
    episodes: weekly,
    finale,
  };
}

export async function getLatestDocumentaryEpisode(
  viewerId: number | null = null,
): Promise<DocumentaryEpisodeView | null> {
  const shelf = await getDocumentaryShelf(viewerId);
  return shelf.featured;
}

export async function getDocumentaryEpisodeById(
  id: number,
  viewerId: number | null = null,
): Promise<DocumentaryEpisodeView | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(documentaryEpisodes)
    .where(eq(documentaryEpisodes.id, id))
    .limit(1);
  if (!row) return null;
  const myRatings = await loadMyRatings([id], viewerId);
  return toView(row, myRatings.get(id) ?? null);
}

export async function generateWeeklyDocumentaryEpisode(
  gameweek: number,
  opts: { notify?: boolean } = {},
): Promise<DocumentaryEpisodeView | null> {
  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") return null;

  const weeks = buildWeeklyGameweeks(
    leagueRosterRows(snapshot.data.standings),
    snapshot.data.bootstrap,
    snapshot.data.histories,
    snapshot.data.db.weekly,
  );

  const week = weeks.find((w) => w.gameweek === gameweek);
  if (!week || !isDocumentaryWeekEligible(week)) return null;

  const previous =
    weeks.find((w) => w.gameweek === gameweek - 1) ?? null;
  const nextEvent = snapshot.data.bootstrap.events.find(
    (e) => e.id === gameweek + 1,
  );
  const standings = [...snapshot.data.standings.standings.results].sort(
    (a, b) => a.rank - b.rank,
  );
  const leaderName = standings[0]?.player_name ?? null;

  const narrative = narrateWeeklyEpisode({
    week,
    previous,
    histories: snapshot.data.histories,
    nextGameweek: nextEvent?.id ?? null,
    seasonComplete: snapshot.data.bootstrap.events.every((e) => e.finished),
    tableLeaderName: leaderName,
  });

  const quote = await getBestChatQuoteForGameweek(gameweek);
  const db = getDb();

  const [existing] = await db
    .select({ id: documentaryEpisodes.id })
    .from(documentaryEpisodes)
    .where(
      and(
        eq(documentaryEpisodes.kind, "weekly"),
        eq(documentaryEpisodes.gameweek, gameweek),
      ),
    )
    .limit(1);

  const values = {
    kind: "weekly" as const,
    gameweek,
    title: narrative.title,
    biggestShock: narrative.biggestShock,
    worstDecision: narrative.worstDecision,
    dramaticOvertake: narrative.dramaticOvertake,
    quoteMessageId: quote?.messageId ?? null,
    quoteBody: quote?.body ?? null,
    quoteManagerName: quote?.managerName ?? null,
    quoteReactionCount: quote?.reactionCount ?? 0,
    cliffhanger: narrative.cliffhanger,
    finaleSummary: null as string | null,
    updatedAt: new Date(),
  };

  let id: number;
  let isNew = false;
  if (existing) {
    await db
      .update(documentaryEpisodes)
      .set(values)
      .where(eq(documentaryEpisodes.id, existing.id));
    id = existing.id;
  } else {
    const [inserted] = await db
      .insert(documentaryEpisodes)
      .values(values)
      .returning({ id: documentaryEpisodes.id });
    id = inserted!.id;
    isNew = true;
  }

  if (isNew && opts.notify !== false) {
    const {
      createNotificationsForManagers,
      listNotifiableManagerIds,
      NOTIFICATION_TYPES,
    } = await import("@/lib/notifications");
    const ids = await listNotifiableManagerIds();
    await createNotificationsForManagers(ids, {
      type: NOTIFICATION_TYPES.DOCUMENTARY_EPISODE,
      title: "New documentary episode",
      body: `GW${gameweek}: ${narrative.title}`,
      href: "/documentary",
      meta: { episodeId: id, gameweek },
    });
  }

  return getDocumentaryEpisodeById(id);
}

export async function generateSeasonFinaleEpisode(
  opts: { notify?: boolean } = {},
): Promise<DocumentaryEpisodeView | null> {
  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") return null;

  const seasonComplete = snapshot.data.bootstrap.events.every(
    (e) => e.finished,
  );
  if (!seasonComplete) return null;

  const weeks = buildWeeklyGameweeks(
    leagueRosterRows(snapshot.data.standings),
    snapshot.data.bootstrap,
    snapshot.data.histories,
    snapshot.data.db.weekly,
  );

  const standings = [...snapshot.data.standings.standings.results].sort(
    (a, b) => a.rank - b.rank,
  );
  const championName = standings[0]?.player_name ?? null;

  const winCounts = new Map<string, number>();
  for (const week of weeks) {
    for (const name of week.winnerNames) {
      winCounts.set(name, (winCounts.get(name) ?? 0) + 1);
    }
  }
  let mostWinsName: string | null = null;
  let mostWinsCount = 0;
  for (const [name, count] of winCounts) {
    if (count > mostWinsCount) {
      mostWinsName = name;
      mostWinsCount = count;
    }
  }

  const hof = await listHallOfFame(12);
  const bestQuotes = hof.slice(0, 5).map((q) => ({
    body: q.body,
    managerName: q.managerName,
    gameweek: q.gameweek,
  }));

  const second = standings[1]?.player_name;
  const rivalryLine =
    championName && second
      ? `All season long, ${championName} and ${second} traded blows in the standings — a rivalry the Dressing Room never let die.`
      : null;

  const { title, body, finaleSummary } = narrateSeasonFinale({
    weeks,
    championName,
    mostWinsName,
    mostWinsCount,
    bestQuotes,
    rivalryLine,
  });

  const topQuote = bestQuotes[0] ?? null;
  const db = getDb();
  const [existing] = await db
    .select({ id: documentaryEpisodes.id })
    .from(documentaryEpisodes)
    .where(eq(documentaryEpisodes.kind, "finale"))
    .limit(1);

  const values = {
    kind: "finale" as const,
    gameweek: null as number | null,
    title,
    biggestShock: body.biggestShock,
    worstDecision: body.worstDecision,
    dramaticOvertake: body.dramaticOvertake,
    quoteMessageId: null as number | null,
    quoteBody: topQuote?.body ?? null,
    quoteManagerName: topQuote?.managerName ?? null,
    quoteReactionCount: topQuote
      ? (hof.find((h) => h.body === topQuote.body)?.reactionCount ?? 0)
      : 0,
    cliffhanger: body.cliffhanger,
    finaleSummary,
    updatedAt: new Date(),
  };

  let id: number;
  let isNewFinale = false;
  if (existing) {
    await db
      .update(documentaryEpisodes)
      .set(values)
      .where(eq(documentaryEpisodes.id, existing.id));
    id = existing.id;
  } else {
    const [inserted] = await db
      .insert(documentaryEpisodes)
      .values(values)
      .returning({ id: documentaryEpisodes.id });
    id = inserted!.id;
    isNewFinale = true;
  }

  if (isNewFinale && opts.notify !== false) {
    const {
      createNotificationsForManagers,
      listNotifiableManagerIds,
      NOTIFICATION_TYPES,
    } = await import("@/lib/notifications");
    const ids = await listNotifiableManagerIds();
    await createNotificationsForManagers(ids, {
      type: NOTIFICATION_TYPES.DOCUMENTARY_EPISODE,
      title: "Season finale is out",
      body: title,
      href: "/documentary",
      meta: { episodeId: id, kind: "finale" },
    });
  }

  return getDocumentaryEpisodeById(id);
}

/**
 * Archive chat for closed GWs, then generate any missing documentary episodes.
 * Throttled — full snapshot + writes must not run on every League page load.
 */
const ENSURE_TTL_MS = 5 * 60_000;
let lastEnsureAt = 0;
let ensureInFlight: Promise<void> | null = null;

export async function ensureDocumentaryEpisodes(): Promise<void> {
  const now = Date.now();
  if (now - lastEnsureAt < ENSURE_TTL_MS && ensureInFlight == null) return;
  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = runEnsureDocumentaryEpisodes()
    .catch(() => undefined)
    .finally(() => {
      lastEnsureAt = Date.now();
      ensureInFlight = null;
    });
  return ensureInFlight;
}

async function runEnsureDocumentaryEpisodes(): Promise<void> {
  try {
    await ensureChatGameweekRollover();
  } catch {
    // Chat rollover is best-effort when FPL is down.
  }

  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") return;

  const weeks = buildWeeklyGameweeks(
    leagueRosterRows(snapshot.data.standings),
    snapshot.data.bootstrap,
    snapshot.data.histories,
    snapshot.data.db.weekly,
  );

  const db = getDb();
  const existing = await db
    .select({
      kind: documentaryEpisodes.kind,
      gameweek: documentaryEpisodes.gameweek,
    })
    .from(documentaryEpisodes);

  const weeklyDone = new Set(
    existing
      .filter((e) => e.kind === "weekly" && e.gameweek != null)
      .map((e) => e.gameweek as number),
  );
  const hasFinale = existing.some((e) => e.kind === "finale");

  // Drop premature / empty-week episodes (e.g. preseason GW1 with 0 pts).
  const weekByGw = new Map(weeks.map((w) => [w.gameweek, w]));
  for (const ep of existing) {
    if (ep.kind !== "weekly" || ep.gameweek == null) continue;
    const week = weekByGw.get(ep.gameweek);
    if (!week || !isDocumentaryWeekEligible(week)) {
      await db
        .delete(documentaryEpisodes)
        .where(
          and(
            eq(documentaryEpisodes.kind, "weekly"),
            eq(documentaryEpisodes.gameweek, ep.gameweek),
          ),
        );
      weeklyDone.delete(ep.gameweek);
    }
  }

  for (const week of weeks) {
    if (!isDocumentaryWeekEligible(week)) continue;
    if (weeklyDone.has(week.gameweek)) continue;
    await generateWeeklyDocumentaryEpisode(week.gameweek, { notify: false });
  }

  const seasonComplete = snapshot.data.bootstrap.events.every(
    (e) => e.finished,
  );
  if (seasonComplete && !hasFinale) {
    await generateSeasonFinaleEpisode({ notify: false });
  }
}

export async function rateDocumentaryEpisode(input: {
  episodeId: number;
  managerId: number;
  stars: number;
}): Promise<DocumentaryEpisodeView> {
  const stars = Math.trunc(input.stars);
  if (stars < 1 || stars > 5) {
    throw new Error("Rating must be between 1 and 5 stars.");
  }

  await requireActingLeagueManager(input.managerId);
  const db = getDb();

  const [episode] = await db
    .select({ id: documentaryEpisodes.id })
    .from(documentaryEpisodes)
    .where(eq(documentaryEpisodes.id, input.episodeId))
    .limit(1);
  if (!episode) throw new Error("Episode not found.");

  const [existing] = await db
    .select({
      id: documentaryRatings.id,
      stars: documentaryRatings.stars,
    })
    .from(documentaryRatings)
    .where(
      and(
        eq(documentaryRatings.episodeId, input.episodeId),
        eq(documentaryRatings.managerId, input.managerId),
      ),
    )
    .limit(1);

  const isFirstRating = !existing;

  if (existing) {
    await db
      .update(documentaryRatings)
      .set({ stars, updatedAt: new Date() })
      .where(eq(documentaryRatings.id, existing.id));
  } else {
    await db.insert(documentaryRatings).values({
      episodeId: input.episodeId,
      managerId: input.managerId,
      stars,
    });
  }

  const [agg] = await db
    .select({
      ratingSum: sql<number>`coalesce(sum(${documentaryRatings.stars}), 0)::int`,
      ratingCount: sql<number>`count(*)::int`,
    })
    .from(documentaryRatings)
    .where(eq(documentaryRatings.episodeId, input.episodeId));

  await db
    .update(documentaryEpisodes)
    .set({
      ratingSum: agg?.ratingSum ?? 0,
      ratingCount: agg?.ratingCount ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(documentaryEpisodes.id, input.episodeId));

  if (isFirstRating) {
    await awardActivityPoints({
      managerId: input.managerId,
      delta: DOCUMENTARY_RATE_ACTIVITY,
      reason: `Rated Documentary episode #${input.episodeId}`,
      actionKey: ACTIVITY_ACTIONS.DOCUMENTARY_RATE,
    });
  }

  const view = await getDocumentaryEpisodeById(
    input.episodeId,
    input.managerId,
  );
  if (!view) throw new Error("Episode not found.");
  return view;
}
