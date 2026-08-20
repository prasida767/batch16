export type RecapPerson = {
  managerId: number;
  name: string;
};

export type RecapMoment = {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  tone: "gold" | "ember" | "ice" | "poison";
};

export type SeasonRecapPayload = {
  seasonLabel: string;
  seasonName: string;
  startYear: number;
  currentSeasonLabel: string;
  viewerName: string;
  viewerManagerId: number;
  champion: RecapPerson | null;
  runnerUp: RecapPerson | null;
  /** Soft “margin” story — weekly-win gap or roast line when totals unknown. */
  winningMarginLine: string;
  highestGw: {
    managerName: string;
    gameweek: number | null;
    points: number | null;
    line: string;
  } | null;
  moments: RecapMoment[];
  viewerStory: {
    played: boolean;
    weeklyWins: number;
    prizes: string[];
    headline: string;
    roast: string;
  };
  welcomeLine: string;
  cliffhanger: string;
};
