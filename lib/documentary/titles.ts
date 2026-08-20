type TitleContext = {
  gameweek: number;
  winnerName: string | null;
  winnerPoints: number;
  worstName: string | null;
  worstPoints: number;
  avgPoints: number;
  overtakePlaces: number;
  shockMargin: number;
  theme:
    | "collapse"
    | "captaincy"
    | "differentials"
    | "template"
    | "overtake"
    | "massacre"
    | "miracle"
    | "chaos";
};

const TITLE_BANK: Record<TitleContext["theme"], (gw: number) => string[]> = {
  collapse: (gw) => [
    `The Collapse of Gameweek ${gw}`,
    `GW${gw}: When the Floor Gave Way`,
    `Falling Apart in Gameweek ${gw}`,
  ],
  captaincy: (gw) => [
    `Captaincy Massacre`,
    `The Armband Betrayal · GW${gw}`,
    `GW${gw} and the Silent Captains`,
  ],
  differentials: (gw) => [
    `When the Differentials Rose`,
    `GW${gw}: Outside the Template`,
    `The Punters Who Dared · Gameweek ${gw}`,
  ],
  template: (gw) => [
    `The Night the Template Died`,
    `GW${gw}: Consensus Crumbles`,
    `Everyone Had Him — Nobody Had Points`,
  ],
  overtake: (gw) => [
    `The Great Overtake of GW${gw}`,
    `Climbing Through the Smoke · Gameweek ${gw}`,
    `From Nowhere to Contender · GW${gw}`,
  ],
  massacre: (gw) => [
    `Points Massacre · Gameweek ${gw}`,
    `Blood on the Green · GW${gw}`,
    `No One Was Safe in Gameweek ${gw}`,
  ],
  miracle: (gw) => [
    `Miracle Week ${gw}`,
    `The Impossible Scoreline · GW${gw}`,
    `Lightning in Gameweek ${gw}`,
  ],
  chaos: (gw) => [
    `Chaos Theory · Gameweek ${gw}`,
    `GW${gw}: Nothing Made Sense`,
    `The Unscripted Hour · Gameweek ${gw}`,
  ],
};

export function pickEpisodeTheme(input: {
  winnerPoints: number;
  worstPoints: number;
  avgPoints: number;
  overtakePlaces: number;
  shockMargin: number;
}): TitleContext["theme"] {
  const spread = input.winnerPoints - input.worstPoints;
  if (input.overtakePlaces >= 4) return "overtake";
  if (input.shockMargin >= 15) return "miracle";
  if (input.worstPoints <= 30 && input.avgPoints >= 45) return "collapse";
  if (spread >= 40) return "massacre";
  if (input.winnerPoints - input.avgPoints >= 18) return "differentials";
  if (input.avgPoints <= 40) return "template";
  if (input.worstPoints <= 35) return "captaincy";
  return "chaos";
}

export function craftEpisodeTitle(ctx: TitleContext): string {
  const bank = TITLE_BANK[ctx.theme](ctx.gameweek);
  const idx = ctx.gameweek % bank.length;
  return bank[idx]!;
}

export function craftCliffhanger(input: {
  nextGameweek: number | null;
  leaderName: string | null;
  seasonComplete: boolean;
}): string {
  if (input.seasonComplete) {
    return "The credits are about to roll — one last chapter remains.";
  }
  if (input.nextGameweek == null) {
    return "The fixtures ahead refuse to settle. Something is coming.";
  }
  const leader = input.leaderName ?? "The table";
  const lines = [
    `Next time: Gameweek ${input.nextGameweek} — and ${leader} cannot sleep easy.`,
    `GW${input.nextGameweek} waits with open traps. Who blinks first?`,
    `The board is reset. Gameweek ${input.nextGameweek} will not be kind.`,
    `Can anyone stop the slide before GW${input.nextGameweek} writes another chapter?`,
  ];
  return lines[input.nextGameweek % lines.length]!;
}
