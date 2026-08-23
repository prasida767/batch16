import { getLiveStandingsPayload } from "@/lib/league";

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
    console.error("[live] GET failed", error);
    return Response.json(
      {
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Couldn't load live scores.",
      },
      { status: 502 },
    );
  }
}
