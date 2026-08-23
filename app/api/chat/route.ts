export const dynamic = "force-dynamic";

import { getActingManagerId } from "@/lib/challenges";
import {
  listActiveChatMessages,
  listPinnedMessages,
  sendChatMessage,
} from "@/lib/chat";
import { listChatRoster } from "@/lib/chat/roster";
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
      skipMaintenance: Boolean(afterId),
    });
    let pinned: typeof messages = [];
    let roster: Awaited<ReturnType<typeof listChatRoster>> = [];
    if (!afterId) {
      try {
        pinned = await listPinnedMessages(gameweek, actingManagerId);
      } catch (error) {
        console.error("[chat] pinned skipped", error);
      }
      try {
        roster = await listChatRoster();
      } catch (error) {
        console.error("[chat] roster skipped", error);
      }
    }

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
    const replyRaw = payload.replyToId;
    const replyToId =
      typeof replyRaw === "number" && Number.isInteger(replyRaw) && replyRaw > 0
        ? replyRaw
        : null;
    const message = await sendChatMessage({
      managerId,
      body: String(payload.body ?? ""),
      replyToId,
    });

    return Response.json({ kind: "ok", message });
  } catch (error) {
    return Response.json(
      {
        kind: "error",
        message: error instanceof Error ? error.message : "Couldn't send.",
      },
      { status: 400 },
    );
  }
}
