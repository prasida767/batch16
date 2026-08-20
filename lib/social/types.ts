export const STANDARD_AWARD_KEYS = {
  HIGHEST_SCORE: "highest_score",
  BEST_DIFFERENTIAL: "best_differential",
  BIGGEST_CLIMB: "biggest_climb",
  WORST_WEEK: "worst_week",
} as const;

export const STANDARD_AWARD_TITLES: Record<string, string> = {
  highest_score: "Highest Score",
  best_differential: "Best Differential",
  biggest_climb: "Biggest Climb",
  worst_week: "Worst Week",
};

export type AwardView = {
  id: number;
  gameweek: number;
  awardKey: string;
  title: string;
  managerId: number | null;
  managerName: string | null;
  detail: string | null;
  isAuto: boolean;
};

export const WALL_POST_ACTIVITY = 3;

/** Flat chronological messages for the live chat widget. */
export type ChatMessage = {
  id: number;
  managerId: number;
  managerName: string;
  body: string;
  createdAt: string;
};
