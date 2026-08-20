import { NextResponse } from "next/server";
import {
  getBootstrapStatic,
  getCurrentGameweek,
  getLeagueId,
  getLeagueStandings,
  getLiveGameweekData,
  getManagerEntry,
  getManagerPicks,
  isFplApiError,
  leagueRosterRows,
} from "@/lib/fpl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dev-friendly smoke test for the FPL service.
 *
 * GET /api/fpl/test
 * GET /api/fpl/test?entryId=123456  (also fetches entry + current GW picks)
 *
 * Disabled in production.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const entryParam = searchParams.get("entryId");
  const entryId = entryParam ? Number(entryParam) : null;

  try {
    const [bootstrap, currentGameweek] = await Promise.all([
      getBootstrapStatic(),
      getCurrentGameweek(),
    ]);

    const leagueId = getLeagueId();
    let league: {
      id: number;
      name: string;
      managers: number;
      top3: Array<{ rank: number; name: string; total: number }>;
    } | null = null;

    if (leagueId != null) {
      const standings = await getLeagueStandings();
      const roster = leagueRosterRows(standings);
      league = {
        id: standings.league.id,
        name: standings.league.name,
        managers: roster.length,
        top3: roster.slice(0, 3).map((row) => ({
          rank: row.rank,
          name: row.player_name,
          total: row.total,
        })),
      };
    }

    let manager: {
      id: number;
      name: string;
      team: string;
      overallPoints: number;
      picks?: { gameweek: number; chip: string | null; starters: number };
    } | null = null;

    if (entryId != null && Number.isInteger(entryId) && entryId > 0) {
      const entry = await getManagerEntry(entryId);
      manager = {
        id: entry.id,
        name: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
        team: entry.name,
        overallPoints: entry.summary_overall_points,
      };

      if (currentGameweek != null) {
        const picks = await getManagerPicks(entryId, currentGameweek);
        manager.picks = {
          gameweek: currentGameweek,
          chip: picks.active_chip,
          starters: picks.picks.filter((p) => p.position <= 11).length,
        };
      }
    }

    let live: { gameweek: number; players: number } | null = null;
    if (currentGameweek != null) {
      const liveData = await getLiveGameweekData(currentGameweek);
      live = {
        gameweek: currentGameweek,
        players: liveData.elements.length,
      };
    }

    return NextResponse.json({
      ok: true,
      baseUrl: "https://fantasy.premierleague.com/api/",
      currentGameweek,
      bootstrap: {
        totalPlayers: bootstrap.total_players,
        teams: bootstrap.teams.length,
        elements: bootstrap.elements.length,
        events: bootstrap.events.length,
      },
      leagueId,
      league,
      manager,
      live,
      tip:
        leagueId == null
          ? "Set FPL_LEAGUE_ID in .env.local to test getLeagueStandings()."
          : entryId == null
            ? "Add ?entryId=YOUR_ENTRY_ID to also test getManagerEntry / getManagerPicks."
            : "All requested endpoints succeeded.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown FPL error";
    const status = isFplApiError(error)
      ? error.status || 502
      : message.includes("FPL_LEAGUE_ID")
        ? 400
        : 502;

    return NextResponse.json(
      {
        ok: false,
        error: message,
        path: isFplApiError(error) ? error.path : undefined,
      },
      { status },
    );
  }
}
