import { getActingManagerId } from "@/lib/challenges";
import { togglePinChatMessage } from "@/lib/chat";
import { isDatabaseConfigured } from "@/lib/db";
import { rejectCrossOrigin } from "@/lib/security/request";

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
    const payload = (await request.json()) as { messageId?: number };
    const messageId = Number(payload.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return Response.json(
        { kind: "error", message: "Invalid message." },
        { status: 400 },
      );
    }

    const adminManagerId = await getActingManagerId();
    const message = await togglePinChatMessage({
      messageId,
      adminManagerId,
    });

    return Response.json({ kind: "ok", message });
  } catch (error) {
    return Response.json(
      {
        kind: "error",
        message: error instanceof Error ? error.message : "Couldn't pin.",
      },
      { status: 400 },
    );
  }
}
