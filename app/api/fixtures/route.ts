import { NextResponse } from "next/server";
import { logAppError } from "@/lib/errors/log";
import { getUpcomingFixtures, isFplApiError } from "@/lib/fpl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Current + next GW fixtures for the League page. */
export async function GET() {
  try {
    const gameweeks = await getUpcomingFixtures();
    return NextResponse.json({
      kind: "ok" as const,
      timezoneHint: "Format kickoffTime in the browser local timezone.",
      gameweeks,
    });
  } catch (error) {
    logAppError("fixtures", error);
    const message = isFplApiError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : "Couldn't load fixtures.";
    return NextResponse.json(
      { kind: "error" as const, message },
      { status: 502 },
    );
  }
}
