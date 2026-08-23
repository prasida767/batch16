import { requireActingManagerId } from "@/lib/challenges";
import { toggleChatReaction } from "@/lib/chat";
import { isDatabaseConfigured } from "@/lib/db";
import { rejectCrossOrigin } from "@/lib/security/request";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const acting = await requireActingManagerId();
    if (!acting.ok) {
      return Response.json(
        { kind: "error", message: acting.message },
        { status: acting.status },
      );
    }
    const managerId = acting.managerId;

    const limited = checkRateLimit(
      `react:${managerId}`,
      RATE_LIMITS.chatReact.limit,
      RATE_LIMITS.chatReact.windowMs,
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
      messageId?: number;
      emoji?: string;
    };
    const messageId = Number(payload.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return Response.json(
        { kind: "error", message: "Invalid message." },
        { status: 400 },
      );
    }

    const message = await toggleChatReaction({
      managerId,
      messageId,
      emoji: String(payload.emoji ?? ""),
    });

    return Response.json({ kind: "ok", message });
  } catch (error) {
    return Response.json(
      {
        kind: "error",
        message:
          error instanceof Error ? error.message : "Couldn't react.",
      },
      { status: 400 },
    );
  }
}
