import { NextResponse } from "next/server";
import { getActingManagerId } from "@/lib/challenges/identity";
import {
  countUnreadNotifications,
  listNotificationsForManager,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { rejectCrossOrigin } from "@/lib/security/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const managerId = await getActingManagerId();
    if (!managerId) {
      return NextResponse.json(
        { kind: "error", message: "Sign in required." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("limit") ?? "30") || 30),
    );
    const afterRaw = url.searchParams.get("after");
    const afterId =
      afterRaw != null && /^\d+$/.test(afterRaw) ? Number(afterRaw) : undefined;

    const items = await listNotificationsForManager(managerId, {
      limit,
      afterId,
    });
    const unreadCount = await countUnreadNotifications(managerId);

    return NextResponse.json({
      kind: "ok" as const,
      items,
      unreadCount,
    });
  } catch (error) {
    console.error("[notifications] GET failed", error);
    return NextResponse.json(
      { kind: "error", message: "Couldn't load notifications." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const cross = rejectCrossOrigin(request);
  if (cross) return cross;

  try {
    const managerId = await getActingManagerId();
    if (!managerId) {
      return NextResponse.json(
        { kind: "error", message: "Sign in required." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { action?: string; id?: number }
      | null;

    if (body?.action === "read_all") {
      const count = await markAllNotificationsRead(managerId);
      return NextResponse.json({ kind: "ok" as const, count });
    }

    if (body?.action === "read" && typeof body.id === "number") {
      const ok = await markNotificationRead({
        managerId,
        notificationId: body.id,
      });
      return NextResponse.json({ kind: "ok" as const, updated: ok });
    }

    return NextResponse.json(
      { kind: "error", message: "Invalid action." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[notifications] PATCH failed", error);
    return NextResponse.json(
      { kind: "error", message: "Couldn't update notifications." },
      { status: 500 },
    );
  }
}
