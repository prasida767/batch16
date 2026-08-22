export const dynamic = "force-dynamic";

import { getActingManagerId } from "@/lib/challenges";
import {
  listActiveChatMessages,
  listPinnedMessages,
  sendChatMessage,
} from "@/lib/chat";
import { listChatRoster } from "@/lib/chat/roster";
import { logAppError } from "@/lib/errors/log";
import { isDatabaseConfigured } from "@/lib/db";
import { rejectCrossOrigin } from "@/lib/security/request";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const revalidate = 0;

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { kind: "error", message: "Database not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const afterRaw = searchParams.get("after");
  const afterId = afterRaw ? Number(afterRaw) : undefined;

  try {
    const actingManagerId = await getActingManagerId();
    const { messages, gameweek } = await listActiveChatMessages({
      limit: afterId ? 50 : 100,
      afterId:
        afterId != null && Number.isInteger(afterId) && afterId > 0
          ? afterId
          : undefined,
      viewerId: actingManagerId,
    });
    const pinned = afterId
      ? []
      : await listPinnedMessages(gameweek, actingManagerId);
    const roster = afterId ? [] : await listChatRoster();

    return Response.json(
      {
        kind: "ok",
        messages,
        pinned,
        gameweek,
        actingManagerId,
        roster,
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    logAppError("chat-api", error, { method: "GET" });
    return Response.json(
      {
        kind: "error",
        message:
          error instanceof Error ? error.message : "Couldn't load chat.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const cross = rejectCrossOrigin(request);
  if (cross) return cross;

  if (!isDatabaseConfigured()) {
    return Response.json(
      { kind: "error", message: "Database not configured." },
      { status: 503 },
    );
  }

  try {
    const managerId = await getActingManagerId();
    if (managerId == null) {
      return Response.json(
        {
          kind: "error",
          message: "Verify your manager account to enter the Dressing Room.",
        },
        { status: 401 },
      );
    }

    const limited = checkRateLimit(
      `api-chat:${managerId}`,
      RATE_LIMITS.chatPost.limit,
      RATE_LIMITS.chatPost.windowMs,
    );
    if (!limited.ok) {
      return Response.json(
        {
          kind: "error",
          message: `Slow down — try again in ${limited.retryAfterSec}s.`,
        },
        { status: 429 },
      );
    }

    const payload = (await request.json()) as {
      body?: string;
      replyToId?: number | null;
    };
    const message = await sendChatMessage({
      managerId,
      body: String(payload.body ?? ""),
      replyToId: payload.replyToId ?? null,
    });

    return Response.json({ kind: "ok", message });
  } catch (error) {
    logAppError("chat-api", error, { method: "POST" });
    return Response.json(
      {
        kind: "error",
        message: error instanceof Error ? error.message : "Couldn't send.",
      },
      { status: 400 },
    );
  }
}
