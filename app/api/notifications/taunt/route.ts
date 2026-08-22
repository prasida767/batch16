import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { getActingManagerId } from "@/lib/challenges/identity";
import { TAUNT_ACTIONS, type TauntActionId } from "@/lib/chat/taunts";
import { getDb, managers } from "@/lib/db";
import {
  createNotification,
  NOTIFICATION_TYPES,
} from "@/lib/notifications";
import { logAppError } from "@/lib/errors/log";
import { rejectCrossOrigin } from "@/lib/security/request";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cross = rejectCrossOrigin(request);
  if (cross) return cross;

  try {
    const actorId = await getActingManagerId();
    if (!actorId) {
      return NextResponse.json(
        { kind: "error", message: "Sign in required." },
        { status: 401 },
      );
    }

    const limited = checkRateLimit(
      `taunt:${actorId}`,
      RATE_LIMITS.taunt.limit,
      RATE_LIMITS.taunt.windowMs,
    );
    if (!limited.ok) {
      return NextResponse.json(
        {
          kind: "error",
          message: `Too many taunts — try again in ${limited.retryAfterSec}s.`,
        },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      action?: string;
      toManagerId?: number;
    } | null;

    const action = body?.action as TauntActionId | undefined;
    const toManagerId = body?.toManagerId;
    const meta = TAUNT_ACTIONS.find((a) => a.id === action);

    if (
      !meta ||
      typeof toManagerId !== "number" ||
      !Number.isInteger(toManagerId) ||
      toManagerId <= 0
    ) {
      return NextResponse.json(
        { kind: "error", message: "Invalid taunt." },
        { status: 400 },
      );
    }
    if (toManagerId === actorId) {
      return NextResponse.json({ kind: "ok", skipped: true });
    }

    const db = getDb();
    const [target] = await db
      .select({ id: managers.id })
      .from(managers)
      .where(and(eq(managers.id, toManagerId), isNotNull(managers.fplEntryId)))
      .limit(1);
    if (!target) {
      return NextResponse.json(
        { kind: "error", message: "Unknown manager." },
        { status: 404 },
      );
    }

    const notification = await createNotification({
      recipientManagerId: toManagerId,
      actorManagerId: actorId,
      type: NOTIFICATION_TYPES.TAUNT,
      title: `${meta.emoji} ${meta.label}`,
      body: `Someone just hit you with a ${meta.label.toLowerCase()} in the Dressing Room.`,
      href: "/dressing-room",
      meta: { action: meta.id },
    });

    return NextResponse.json({ kind: "ok" as const, notification });
  } catch (error) {
    logAppError("taunt", error);
    return NextResponse.json(
      { kind: "error", message: "Couldn't send that taunt." },
      { status: 502 },
    );
  }
}
