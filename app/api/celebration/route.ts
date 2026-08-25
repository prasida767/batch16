import { NextResponse } from "next/server";
import { loadActiveGwWinnerCelebration } from "@/lib/league/celebration";

export const dynamic = "force-dynamic";

/**
 * Winner banner payload. DB read only — never pull FPL histories here.
 * Persist/recalc belongs on admin save, not on every signed-in page load.
 * Auth is already enforced by middleware for /api/*.
 */
export async function GET() {
  try {
    const celebration = await loadActiveGwWinnerCelebration();
    return NextResponse.json({ kind: "ok" as const, celebration });
  } catch (error) {
    console.error("[celebration] GET failed", error);
    return NextResponse.json(
      { kind: "ok" as const, celebration: null },
      { status: 200 },
    );
  }
}
