import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, managerAccounts, managers, notifications } from "@/lib/db";
import type {
  CreateNotificationInput,
  NotificationView,
} from "@/lib/notifications/types";
export { resolveMentionedManagerIds } from "@/lib/notifications/mentions";

function toView(row: {
  id: number;
  recipientManagerId: number;
  actorManagerId: number | null;
  actorName: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  meta: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  return {
    id: row.id,
    recipientManagerId: row.recipientManagerId,
    actorManagerId: row.actorManagerId,
    actorName: row.actorName,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    meta: row.meta ?? {},
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Insert a notification. Never throws into the caller’s main flow. */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationView | null> {
  try {
    if (input.actorManagerId != null && input.actorManagerId === input.recipientManagerId) {
      return null;
    }
    const db = getDb();
    const [row] = await db
      .insert(notifications)
      .values({
        recipientManagerId: input.recipientManagerId,
        actorManagerId: input.actorManagerId ?? null,
        type: input.type,
        title: input.title.slice(0, 160),
        body: input.body?.slice(0, 400) ?? null,
        href: input.href ?? null,
        meta: input.meta ?? {},
      })
      .returning({
        id: notifications.id,
        recipientManagerId: notifications.recipientManagerId,
        actorManagerId: notifications.actorManagerId,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        href: notifications.href,
        meta: notifications.meta,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      });

    if (!row) return null;

    let actorName: string | null = null;
    if (row.actorManagerId != null) {
      const [actor] = await db
        .select({ displayName: managers.displayName })
        .from(managers)
        .where(eq(managers.id, row.actorManagerId))
        .limit(1);
      actorName = actor?.displayName ?? null;
    }

    return toView({ ...row, actorName });
  } catch (err) {
    console.error("[notifications] create failed", err);
    return null;
  }
}

export async function createNotificationsForManagers(
  recipientIds: number[],
  input: Omit<CreateNotificationInput, "recipientManagerId">,
): Promise<void> {
  const unique = [...new Set(recipientIds)].filter(
    (id) => id !== input.actorManagerId,
  );
  if (unique.length === 0) return;
  await Promise.all(
    unique.map((recipientManagerId) =>
      createNotification({ ...input, recipientManagerId }),
    ),
  );
}

export async function listNotificationsForManager(
  managerId: number,
  opts: { limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationView[]> {
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 80);
  const db = getDb();
  const rows = await db
    .select({
      id: notifications.id,
      recipientManagerId: notifications.recipientManagerId,
      actorManagerId: notifications.actorManagerId,
      actorName: managers.displayName,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      href: notifications.href,
      meta: notifications.meta,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(managers, eq(notifications.actorManagerId, managers.id))
    .where(
      and(
        eq(notifications.recipientManagerId, managerId),
        opts.unreadOnly ? isNull(notifications.readAt) : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map(toView);
}

export async function countUnreadNotifications(
  managerId: number,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientManagerId, managerId),
        isNull(notifications.readAt),
      ),
    );
  return row?.count ?? 0;
}

export async function markNotificationRead(input: {
  managerId: number;
  notificationId: number;
}): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.recipientManagerId, input.managerId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });
  return updated.length > 0;
}

export async function markAllNotificationsRead(
  managerId: number,
): Promise<number> {
  const db = getDb();
  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientManagerId, managerId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });
  return updated.length;
}

/** Verified (claimed) managers — for league-wide announcements. */
export async function listNotifiableManagerIds(): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .select({ id: managers.id })
    .from(managers)
    .innerJoin(managerAccounts, eq(managerAccounts.managerId, managers.id))
    .where(isNotNull(managers.fplEntryId));
  return rows.map((r) => r.id);
}

export async function listManagersForMentions(): Promise<
  { id: number; displayName: string }[]
> {
  const db = getDb();
  return db
    .select({ id: managers.id, displayName: managers.displayName })
    .from(managers)
    .where(isNotNull(managers.fplEntryId));
}

export async function getNotificationsByIds(
  ids: number[],
): Promise<NotificationView[]> {
  if (ids.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: notifications.id,
      recipientManagerId: notifications.recipientManagerId,
      actorManagerId: notifications.actorManagerId,
      actorName: managers.displayName,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      href: notifications.href,
      meta: notifications.meta,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(managers, eq(notifications.actorManagerId, managers.id))
    .where(inArray(notifications.id, ids));
  return rows.map(toView);
}
