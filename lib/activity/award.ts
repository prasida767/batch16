import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb, activityEvents, managers, settings } from "@/lib/db";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_PRIZE_SETTING_KEY,
  type AwardActivityPointsInput,
} from "@/lib/activity/types";

/**
 * Single entry point for changing activity points.
 * Updates the manager total and appends an audit row.
 * Call this from admin tools or future automatic hooks.
 */
export async function awardActivityPoints(
  input: AwardActivityPointsInput,
): Promise<{ activityPoints: number }> {
  const delta = Math.trunc(input.delta);
  if (!Number.isInteger(input.managerId) || input.managerId <= 0) {
    throw new Error("Invalid manager.");
  }
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("Delta must be a non-zero integer.");
  }
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("Reason is required.");
  }

  const db = getDb();
  const actionKey = input.actionKey?.trim() || ACTIVITY_ACTIONS.MANUAL;

  // Sequential writes — never db.transaction(). Supabase's transaction-mode
  // pooler (PgBouncer) cannot BEGIN/COMMIT and that crash takes the app down.
  const [manager] = await db
    .select({
      id: managers.id,
      activityPoints: managers.activityPoints,
    })
    .from(managers)
    .where(eq(managers.id, input.managerId))
    .limit(1);

  if (!manager) {
    throw new Error("Manager not found.");
  }

  const next = manager.activityPoints + delta;
  await db
    .update(managers)
    .set({ activityPoints: next })
    .where(eq(managers.id, input.managerId));

  await db.insert(activityEvents).values({
    managerId: input.managerId,
    delta,
    reason,
    actionKey,
  });

  return { activityPoints: next };
}

export async function getActivityPrizeDisplay(): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, ACTIVITY_PRIZE_SETTING_KEY))
    .limit(1);
  return row?.value?.trim() || "TBD";
}

export async function setActivityPrizeDisplay(
  value: string,
): Promise<string> {
  const display = value.trim() || "TBD";
  const db = getDb();
  await db
    .insert(settings)
    .values({ key: ACTIVITY_PRIZE_SETTING_KEY, value: display })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: display },
    });
  return display;
}

/** Convenience for future automation — noop-safe wrapper around award. */
export async function awardForAction(args: {
  managerId: number;
  actionKey: string;
  delta: number;
  reason: string;
}) {
  return awardActivityPoints({
    managerId: args.managerId,
    delta: args.delta,
    reason: args.reason,
    actionKey: args.actionKey,
  });
}

/** Used by tests / health checks — sum of deltas should match total. */
export async function sumActivityEventDeltas(managerId: number): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${activityEvents.delta}), 0)::int`,
    })
    .from(activityEvents)
    .where(eq(activityEvents.managerId, managerId));
  return Number(row?.total ?? 0);
}
