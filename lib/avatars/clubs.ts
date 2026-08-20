/**
 * Premier League club palette + FPL team codes for crest badges.
 * `id` matches FPL bootstrap `teams[].id` for the current season when possible;
 * claim flow prefers live bootstrap and falls back to this list.
 */
export type ClubDefinition = {
  id: number;
  name: string;
  shortName: string;
  /** FPL / PL badge code → resources.premierleague.com/.../t{code}.png */
  code: number;
  primary: string;
  secondary: string;
};

export const AVATAR_VARIANT_COUNT = 8;

export const CLUB_DEFINITIONS: ClubDefinition[] = [
  { id: 1, name: "Arsenal", shortName: "ARS", code: 3, primary: "#EF0107", secondary: "#FFFFFF" },
  { id: 2, name: "Aston Villa", shortName: "AVL", code: 7, primary: "#670E36", secondary: "#95BFE5" },
  { id: 3, name: "Bournemouth", shortName: "BOU", code: 91, primary: "#DA291C", secondary: "#000000" },
  { id: 4, name: "Brentford", shortName: "BRE", code: 94, primary: "#E30613", secondary: "#FBB800" },
  { id: 5, name: "Brighton", shortName: "BHA", code: 36, primary: "#0057B8", secondary: "#FFFFFF" },
  { id: 6, name: "Chelsea", shortName: "CHE", code: 8, primary: "#034694", secondary: "#FFFFFF" },
  { id: 7, name: "Crystal Palace", shortName: "CRY", code: 31, primary: "#1B458F", secondary: "#C4122E" },
  { id: 8, name: "Everton", shortName: "EVE", code: 11, primary: "#003399", secondary: "#FFFFFF" },
  { id: 9, name: "Fulham", shortName: "FUL", code: 54, primary: "#000000", secondary: "#FFFFFF" },
  { id: 10, name: "Ipswich", shortName: "IPS", code: 40, primary: "#DE2C37", secondary: "#0055A4" },
  { id: 11, name: "Leicester", shortName: "LEI", code: 13, primary: "#003090", secondary: "#FDBE11" },
  { id: 12, name: "Liverpool", shortName: "LIV", code: 14, primary: "#C8102E", secondary: "#FFFFFF" },
  { id: 13, name: "Man City", shortName: "MCI", code: 43, primary: "#6CABDD", secondary: "#1C2C5B" },
  { id: 14, name: "Man Utd", shortName: "MUN", code: 1, primary: "#DA291C", secondary: "#FBE122" },
  { id: 15, name: "Newcastle", shortName: "NEW", code: 4, primary: "#241F20", secondary: "#FFFFFF" },
  { id: 16, name: "Nott'm Forest", shortName: "NFO", code: 17, primary: "#DD0000", secondary: "#FFFFFF" },
  { id: 17, name: "Southampton", shortName: "SOU", code: 20, primary: "#D71920", secondary: "#FFFFFF" },
  { id: 18, name: "Spurs", shortName: "TOT", code: 6, primary: "#132257", secondary: "#FFFFFF" },
  { id: 19, name: "West Ham", shortName: "WHU", code: 21, primary: "#7A263A", secondary: "#1BB1E7" },
  { id: 20, name: "Wolves", shortName: "WOL", code: 39, primary: "#FDB913", secondary: "#231F20" },
];

export type ClubAvatarSpec = {
  teamId: number;
  variant: number;
  code: number;
  primary: string;
  secondary: string;
  shortName: string;
  name: string;
};

export function clubBadgeUrl(code: number, size: 40 | 70 | 100 = 70): string {
  return `https://resources.premierleague.com/premierleague/badges/${size}/t${code}.png`;
}

export function findClubDefinition(teamId: number): ClubDefinition | null {
  return CLUB_DEFINITIONS.find((c) => c.id === teamId) ?? null;
}

/** Stable unique-ish variant from manager id (and optional salt). */
export function defaultAvatarVariant(managerId: number, teamId: number): number {
  const n = Math.abs((managerId * 31 + teamId * 17) | 0);
  return n % AVATAR_VARIANT_COUNT;
}

export function buildClubAvatarSpec(
  teamId: number,
  variant: number,
  clubs: ClubDefinition[] = CLUB_DEFINITIONS,
  teamCode?: number | null,
): ClubAvatarSpec | null {
  const club =
    clubs.find((c) => c.id === teamId) ??
    (teamCode != null
      ? clubs.find((c) => c.code === teamCode) ??
        CLUB_DEFINITIONS.find((c) => c.code === teamCode)
      : null) ??
    findClubDefinition(teamId);
  if (!club && teamCode == null) return null;

  const v =
    ((variant % AVATAR_VARIANT_COUNT) + AVATAR_VARIANT_COUNT) %
    AVATAR_VARIANT_COUNT;
  const code = teamCode ?? club!.code;
  const palette =
    club ??
    CLUB_DEFINITIONS.find((c) => c.code === code) ??
    ({
      id: teamId,
      name: "Club",
      shortName: "FPL",
      code,
      primary: "#0f766e",
      secondary: "#ecfdf5",
    } satisfies ClubDefinition);

  return {
    teamId: palette.id,
    variant: v,
    code: palette.code,
    primary: palette.primary,
    secondary: palette.secondary,
    shortName: palette.shortName,
    name: palette.name,
  };
}

export function mergeClubsFromBootstrap(
  bootstrapTeams: Array<{
    id: number;
    name: string;
    short_name: string;
    code: number;
  }>,
): ClubDefinition[] {
  if (!bootstrapTeams.length) return CLUB_DEFINITIONS;
  return bootstrapTeams
    .map((team) => {
      const fallback =
        CLUB_DEFINITIONS.find((c) => c.shortName === team.short_name) ??
        findClubDefinition(team.id);
      return {
        id: team.id,
        name: team.name,
        shortName: team.short_name,
        code: team.code,
        primary: fallback?.primary ?? "#0f766e",
        secondary: fallback?.secondary ?? "#ecfdf5",
      } satisfies ClubDefinition;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
