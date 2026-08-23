import { NextResponse } from "next/server";
import { getAuthStatus } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Lightweight session for the signed-in chrome.
 * Kept off the root layout so Vercel HTML is not blocked on Postgres / FPL.
 */
export async function GET() {
  try {
    const auth = await getAuthStatus();
    if (!auth.signedIn) {
      return NextResponse.json({ kind: "signed_out" as const });
    }

    return NextResponse.json({
      kind: "ok" as const,
      authLabel: auth.manager?.displayName ?? auth.email,
      managerId: auth.manager?.managerId ?? null,
      managerName: auth.manager?.displayName ?? null,
      needsClaim: auth.claimState === "unlinked",
      isAdmin: auth.isAdmin,
      celebration: null,
    });
  } catch (error) {
    console.error("[session] GET failed", error);
    return NextResponse.json(
      { kind: "error" as const, message: "Couldn't load session." },
      { status: 500 },
    );
  }
}
