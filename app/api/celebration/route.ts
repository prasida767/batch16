import { NextResponse } from "next/server";
import { getAuthStatus } from "@/lib/auth/session";
import { loadActiveGwWinnerCelebration } from "@/lib/league/celebration";
import { ensureSettledWinnersPersisted } from "@/lib/league/persist-winners";

export const dynamic = "force-dynamic";

/**
 * Winner banner payload. Separate from /api/session so chat/manager id
 * is not blocked on FPL history when a GW has just settled.
 */
export async function GET() {
  try {
    const auth = await getAuthStatus();
    if (!auth.signedIn) {
      return NextResponse.json({ kind: "signed_out" as const });
    }

    let celebration = await loadActiveGwWinnerCelebration();
    if (!celebration) {
      try {
        await ensureSettledWinnersPersisted();
        celebration = await loadActiveGwWinnerCelebration();
      } catch (error) {
        console.error("[celebration] persist skipped", error);
      }
    }

    return NextResponse.json({ kind: "ok" as const, celebration });
  } catch (error) {
    console.error("[celebration] GET failed", error);
    return NextResponse.json(
      { kind: "ok" as const, celebration: null },
      { status: 200 },
    );
  }
}
