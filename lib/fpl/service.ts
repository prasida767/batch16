import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { fplFetch } from "./client";
import {
  FPL_CACHE,
  FPL_CACHE_TAGS,
  getLeagueId,
  requireLeagueId,
} from "./config";
import type {
  FplBootstrapStatic,
  FplClassicLeagueStandings,
  FplEvent,
  FplFixture,
  FplLiveEvent,
  FplManagerEntry,
  FplManagerHistory,
  FplManagerPicks,
} from "./types";

function assertPositiveId(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

/**
 * Full FPL static dataset: events, teams, players, positions.
 * Cached ~5 minutes via Next `unstable_cache` + request-deduped with React `cache`.
 */
export const getBootstrapStatic = cache(async (): Promise<FplBootstrapStatic> => {
  return unstable_cache(
    async () =>
      fplFetch<FplBootstrapStatic>("/bootstrap-static/", {
        revalidate: FPL_CACHE.bootstrap,
        tags: [FPL_CACHE_TAGS.bootstrap],
      }),
    ["fpl-bootstrap-static"],
    {
      revalidate: FPL_CACHE.bootstrap,
      tags: [FPL_CACHE_TAGS.all, FPL_CACHE_TAGS.bootstrap],
    },
  )();
});

/**
 * Classic league standings for `FPL_LEAGUE_ID` (all pages).
 * Throws if the env var is missing.
 */
export async function getLeagueStandings(): Promise<FplClassicLeagueStandings> {
  const leagueId = requireLeagueId();
  return getClassicLeagueStandings(leagueId);
}

/**
 * Classic league standings for an explicit league ID (50 rows per page by default;
 * this helper walks every page).
 */
export async function getClassicLeagueStandings(
  leagueId: number,
): Promise<FplClassicLeagueStandings> {
  assertPositiveId(leagueId, "leagueId");

  return unstable_cache(
    async () => {
      const first = await fetchLeagueStandingsPage(leagueId, 1);
      const results = [...first.standings.results];
      let page = first.standings.page;
      let hasNext = first.standings.has_next;

      while (hasNext) {
        page += 1;
        const next = await fetchLeagueStandingsPage(leagueId, page);
        results.push(...next.standings.results);
        hasNext = next.standings.has_next;
      }

      const newEntries = [...first.new_entries.results];
      let newPage = first.new_entries.page;
      let newHasNext = first.new_entries.has_next;
      while (newHasNext) {
        newPage += 1;
        const next = await fplFetch<FplClassicLeagueStandings>(
          `/leagues-classic/${leagueId}/standings/?page_new_entries=${newPage}`,
          {
            revalidate: FPL_CACHE.league,
            tags: [FPL_CACHE_TAGS.league(leagueId)],
          },
        );
        newEntries.push(...next.new_entries.results);
        newHasNext = next.new_entries.has_next;
      }

      return {
        ...first,
        standings: {
          ...first.standings,
          has_next: false,
          page: 1,
          results,
        },
        new_entries: {
          ...first.new_entries,
          has_next: false,
          page: 1,
          results: newEntries,
        },
      } satisfies FplClassicLeagueStandings;
    },
    ["fpl-league-standings", String(leagueId)],
    {
      revalidate: FPL_CACHE.league,
      tags: [FPL_CACHE_TAGS.all, FPL_CACHE_TAGS.league(leagueId)],
    },
  )();
}

const fetchLeagueStandingsPage = cache(
  async (leagueId: number, page: number) => {
    const query = page > 1 ? `?page_standings=${page}` : "";
    return fplFetch<FplClassicLeagueStandings>(
      `/leagues-classic/${leagueId}/standings/${query}`,
      {
        revalidate: FPL_CACHE.league,
        tags: [FPL_CACHE_TAGS.league(leagueId)],
      },
    );
  },
);

/** Public profile + season summary for a manager entry. */
export const getManagerEntry = cache(
  async (entryId: number): Promise<FplManagerEntry> => {
    assertPositiveId(entryId, "entryId");
    return unstable_cache(
      async () =>
        fplFetch<FplManagerEntry>(`/entry/${entryId}/`, {
          revalidate: FPL_CACHE.entry,
          tags: [FPL_CACHE_TAGS.entry(entryId)],
        }),
      ["fpl-manager-entry", String(entryId)],
      {
        revalidate: FPL_CACHE.entry,
        tags: [FPL_CACHE_TAGS.all, FPL_CACHE_TAGS.entry(entryId)],
      },
    )();
  },
);

/** Gameweek-by-gameweek scores, chips, and past seasons for an entry. */
export const getManagerHistory = cache(
  async (entryId: number): Promise<FplManagerHistory> => {
    assertPositiveId(entryId, "entryId");
    return unstable_cache(
      async () =>
        fplFetch<FplManagerHistory>(`/entry/${entryId}/history/`, {
          revalidate: FPL_CACHE.history,
          tags: [FPL_CACHE_TAGS.history(entryId)],
        }),
      ["fpl-manager-history", String(entryId)],
      {
        revalidate: FPL_CACHE.history,
        tags: [FPL_CACHE_TAGS.all, FPL_CACHE_TAGS.history(entryId)],
      },
    )();
  },
);

/** Squad picks, chips, and autosubs for one gameweek. */
export const getManagerPicks = cache(
  async (entryId: number, gameweek: number): Promise<FplManagerPicks> => {
    assertPositiveId(entryId, "entryId");
    assertPositiveId(gameweek, "gameweek");
    return unstable_cache(
      async () =>
        fplFetch<FplManagerPicks>(
          `/entry/${entryId}/event/${gameweek}/picks/`,
          {
            revalidate: FPL_CACHE.picks,
            tags: [FPL_CACHE_TAGS.picks(entryId, gameweek)],
          },
        ),
      ["fpl-manager-picks", String(entryId), String(gameweek)],
      {
        revalidate: FPL_CACHE.picks,
        tags: [
          FPL_CACHE_TAGS.all,
          FPL_CACHE_TAGS.picks(entryId, gameweek),
        ],
      },
    )();
  },
);

/** Live points and match stats for every player in a gameweek. */
export const getLiveGameweekData = cache(
  async (gameweek: number): Promise<FplLiveEvent> => {
    assertPositiveId(gameweek, "gameweek");
    return unstable_cache(
      async () =>
        fplFetch<FplLiveEvent>(`/event/${gameweek}/live/`, {
          revalidate: FPL_CACHE.live,
          tags: [FPL_CACHE_TAGS.live(gameweek)],
        }),
      ["fpl-live-gameweek", String(gameweek)],
      {
        revalidate: FPL_CACHE.live,
        tags: [FPL_CACHE_TAGS.all, FPL_CACHE_TAGS.live(gameweek)],
      },
    )();
  },
);

/** Current event object from bootstrap-static, or `null` before the season. */
export async function getCurrentEvent(): Promise<FplEvent | null> {
  const bootstrap = await getBootstrapStatic();
  return bootstrap.events.find((event) => event.is_current) ?? null;
}

/** Current gameweek number, or `null` if none is marked current. */
export async function getCurrentGameweek(): Promise<number | null> {
  const event = await getCurrentEvent();
  return event?.id ?? null;
}

/** Fixtures for one gameweek (`/fixtures/?event=N`). */
export async function getFixturesForEvent(
  eventId: number,
): Promise<FplFixture[]> {
  assertPositiveId(eventId, "eventId");
  return unstable_cache(
    async () =>
      fplFetch<FplFixture[]>(`/fixtures/?event=${eventId}`, {
        revalidate: FPL_CACHE.fixtures,
        tags: [
          FPL_CACHE_TAGS.fixtures,
          FPL_CACHE_TAGS.fixturesEvent(eventId),
        ],
      }),
    ["fpl-fixtures-event", String(eventId)],
    {
      revalidate: FPL_CACHE.fixtures,
      tags: [
        FPL_CACHE_TAGS.all,
        FPL_CACHE_TAGS.fixtures,
        FPL_CACHE_TAGS.fixturesEvent(eventId),
      ],
    },
  )();
}

export type UpcomingFixtureTeam = {
  id: number;
  name: string;
  shortName: string;
  code: number;
  badgeUrl: string;
};

export type UpcomingFixtureView = {
  id: number;
  kickoffTime: string | null;
  started: boolean;
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  home: UpcomingFixtureTeam;
  away: UpcomingFixtureTeam;
};

export type UpcomingGameweekFixtures = {
  eventId: number;
  name: string;
  isCurrent: boolean;
  isNext: boolean;
  fixtures: UpcomingFixtureView[];
};

/** Official PL crest from FPL team `code`. */
export function teamBadgeUrl(code: number, size: 40 | 70 | 100 = 70): string {
  return `https://resources.premierleague.com/premierleague/badges/${size}/t${code}.png`;
}

/**
 * Current + next gameweek fixtures for the League page.
 * Kick-off times are ISO UTC — format in the browser with local timezone.
 */
export async function getUpcomingFixtures(): Promise<UpcomingGameweekFixtures[]> {
  const bootstrap = await getBootstrapStatic();
  const current =
    bootstrap.events.find((event) => event.is_current) ??
    bootstrap.events.find((event) => event.is_next) ??
    null;
  const next =
    bootstrap.events.find((event) => event.is_next) ??
    (current
      ? bootstrap.events.find((event) => event.id === current.id + 1) ?? null
      : null);

  const events = [current, next].filter(
    (event, index, list): event is FplEvent =>
      event != null && list.findIndex((e) => e?.id === event.id) === index,
  );

  if (events.length === 0) return [];

  const teams = new Map(
    bootstrap.teams.map((team) => [
      team.id,
      {
        id: team.id,
        name: team.name,
        shortName: team.short_name,
        code: team.code,
        badgeUrl: teamBadgeUrl(team.code, 70),
      } satisfies UpcomingFixtureTeam,
    ]),
  );

  const groups = await Promise.all(
    events.map(async (event) => {
      const raw = await getFixturesForEvent(event.id);
      const fixtures = raw
        .map((fixture) => {
          const home = teams.get(fixture.team_h);
          const away = teams.get(fixture.team_a);
          if (!home || !away) return null;
          return {
            id: fixture.id,
            kickoffTime: fixture.kickoff_time,
            started: fixture.started,
            finished: fixture.finished || fixture.finished_provisional,
            homeScore: fixture.team_h_score,
            awayScore: fixture.team_a_score,
            home,
            away,
          } satisfies UpcomingFixtureView;
        })
        .filter((row): row is UpcomingFixtureView => row != null)
        .sort((a, b) => {
          if (!a.kickoffTime && !b.kickoffTime) return a.id - b.id;
          if (!a.kickoffTime) return 1;
          if (!b.kickoffTime) return -1;
          return (
            Date.parse(a.kickoffTime) - Date.parse(b.kickoffTime) || a.id - b.id
          );
        });

      return {
        eventId: event.id,
        name: event.name,
        isCurrent: event.is_current,
        isNext: event.is_next,
        fixtures,
      } satisfies UpcomingGameweekFixtures;
    }),
  );

  return groups;
}

/** Invalidate all FPL caches, or a specific tag (e.g. after a manual refresh). */
export function revalidateFplData(tag: string = FPL_CACHE_TAGS.all) {
  revalidateTag(tag);
}

// ---------------------------------------------------------------------------
// Back-compat aliases (existing app code imports these names)
// ---------------------------------------------------------------------------

export const fetchBootstrapStatic = getBootstrapStatic;
export const fetchClassicLeagueStandings = fetchLeagueStandingsPage;
export const fetchAllClassicLeagueStandings = getClassicLeagueStandings;
export const fetchManagerEntry = getManagerEntry;
export const fetchManagerHistory = getManagerHistory;
export const fetchManagerPicks = getManagerPicks;
export const fetchLiveGameweek = getLiveGameweekData;
export const fetchCurrentEvent = getCurrentEvent;

export { getLeagueId, requireLeagueId };
