import "server-only";

import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb, managers, wallPosts } from "@/lib/db";
import { awardActivityPoints } from "@/lib/activity";
import { ACTIVITY_ACTIONS } from "@/lib/activity/types";
import { requireActingLeagueManager } from "@/lib/challenges/identity";
import { WALL_POST_ACTIVITY, type ChatMessage } from "@/lib/social/types";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { sanitizeUserText } from "@/lib/security/sanitize";
import { getAuthStatus } from "@/lib/auth/session";

export type WallPostView = {
  id: number;
  managerId: number;
  managerName: string;
  body: string;
  parentId: number | null;
  createdAt: Date | string;
  replies: WallPostView[];
};

export type { ChatMessage };

export async function createWallPost(input: {
  managerId: number;
  body: string;
  parentId?: number | null;
}) {
  const body = sanitizeUserText(input.body, 500);
  if (body.length < 1 || body.length > 500) {
    throw new Error("Message must be 1–500 characters.");
  }

  await requireActingLeagueManager(input.managerId);

  const limited = checkRateLimit(
    `wall:${input.managerId}`,
    RATE_LIMITS.wallPost.limit,
    RATE_LIMITS.wallPost.windowMs,
  );
  if (!limited.ok) {
    throw new Error(
      `Slow down — try posting again in ${limited.retryAfterSec}s.`,
    );
  }

  const db = getDb();
  if (input.parentId) {
    const [parent] = await db
      .select({ id: wallPosts.id, deletedAt: wallPosts.deletedAt })
      .from(wallPosts)
      .where(eq(wallPosts.id, input.parentId))
      .limit(1);
    if (!parent || parent.deletedAt) {
      throw new Error("Parent post not found.");
    }
  }

  const [inserted] = await db
    .insert(wallPosts)
    .values({
      managerId: input.managerId,
      body,
      parentId: input.parentId ?? null,
    })
    .returning({ id: wallPosts.id });

  await awardActivityPoints({
    managerId: input.managerId,
    delta: WALL_POST_ACTIVITY,
    reason: input.parentId
      ? `Replied on the wall (#${inserted!.id})`
      : `Posted on the wall (#${inserted!.id})`,
    actionKey: ACTIVITY_ACTIONS.WALL_POST,
  });

  return inserted!.id;
}

/**
 * Soft-delete a wall post. Author may delete their own; admins may delete any.
 */
export async function softDeleteWallPost(input: {
  id: number;
  actorManagerId?: number | null;
  asAdmin?: boolean;
}) {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error("Invalid post.");
  }

  const db = getDb();
  const [post] = await db
    .select({
      id: wallPosts.id,
      managerId: wallPosts.managerId,
      deletedAt: wallPosts.deletedAt,
    })
    .from(wallPosts)
    .where(eq(wallPosts.id, input.id))
    .limit(1);

  if (!post || post.deletedAt) {
    throw new Error("Post not found.");
  }

  let asAdmin = Boolean(input.asAdmin);
  if (!asAdmin) {
    const auth = await getAuthStatus();
    asAdmin = auth.isAdmin;
  }

  const isAuthor =
    input.actorManagerId != null && input.actorManagerId === post.managerId;

  if (!asAdmin && !isAuthor) {
    throw new Error("You can only delete your own posts.");
  }

  await db
    .update(wallPosts)
    .set({ deletedAt: new Date() })
    .where(eq(wallPosts.id, input.id));
}

export async function listWallFeed(limit = 40): Promise<WallPostView[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: wallPosts.id,
      managerId: wallPosts.managerId,
      managerName: managers.displayName,
      body: wallPosts.body,
      parentId: wallPosts.parentId,
      createdAt: wallPosts.createdAt,
    })
    .from(wallPosts)
    .innerJoin(managers, eq(wallPosts.managerId, managers.id))
    .where(isNull(wallPosts.deletedAt))
    .orderBy(desc(wallPosts.createdAt))
    .limit(200);

  const byId = new Map<number, WallPostView>();
  for (const row of rows) {
    byId.set(row.id, { ...row, replies: [] });
  }

  const roots: WallPostView[] = [];
  for (const post of byId.values()) {
    if (post.parentId != null && byId.has(post.parentId)) {
      byId.get(post.parentId)!.replies.push(post);
    } else if (post.parentId == null) {
      roots.push(post);
    }
  }

  for (const root of roots) {
    root.replies.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  return roots.slice(0, limit);
}

export async function listRecentWallPosts(limit = 5): Promise<WallPostView[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: wallPosts.id,
      managerId: wallPosts.managerId,
      managerName: managers.displayName,
      body: wallPosts.body,
      parentId: wallPosts.parentId,
      createdAt: wallPosts.createdAt,
    })
    .from(wallPosts)
    .innerJoin(managers, eq(wallPosts.managerId, managers.id))
    .where(and(isNull(wallPosts.deletedAt), isNull(wallPosts.parentId)))
    .orderBy(desc(wallPosts.createdAt))
    .limit(limit);

  return rows.map((row) => ({ ...row, replies: [] }));
}

/** Newest-last timeline for chat UI. Optionally only messages after `afterId`. */
export async function listChatMessages(options?: {
  limit?: number;
  afterId?: number;
}): Promise<ChatMessage[]> {
  const limit = Math.min(Math.max(options?.limit ?? 80, 1), 150);
  const afterId = options?.afterId;
  const db = getDb();

  const rows = await db
    .select({
      id: wallPosts.id,
      managerId: wallPosts.managerId,
      managerName: managers.displayName,
      body: wallPosts.body,
      createdAt: wallPosts.createdAt,
    })
    .from(wallPosts)
    .innerJoin(managers, eq(wallPosts.managerId, managers.id))
    .where(
      afterId != null && Number.isInteger(afterId) && afterId > 0
        ? and(isNull(wallPosts.deletedAt), gt(wallPosts.id, afterId))
        : isNull(wallPosts.deletedAt),
    )
    .orderBy(afterId ? asc(wallPosts.id) : desc(wallPosts.createdAt))
    .limit(limit);

  const ordered = afterId ? rows : [...rows].reverse();

  return ordered.map((row) => ({
    id: row.id,
    managerId: row.managerId,
    managerName: row.managerName,
    body: row.body,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
  }));
}
