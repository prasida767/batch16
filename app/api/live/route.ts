import { getLiveStandingsPayload } from "@/lib/league";
import { logAppError } from "@/lib/errors/log";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const result = await getLiveStandingsPayload();

    if (result.kind === "no_league") {
      return Response.json(
        { kind: "no_league", message: "FPL_LEAGUE_ID is not set." },
        { status: 400 },
      );
    }

    if (result.kind === "error") {
      return Response.json(
        { kind: "error", message: result.message },
        { status: 502 },
      );
    }

    return Response.json(
      { kind: result.kind, data: result.data },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    logAppError("live-api", error);
    return Response.json(
      {
        kind: "error",
        message: "Couldn't load live scores. Try again in a moment.",
      },
      { status: 502 },
    );
  }
}
