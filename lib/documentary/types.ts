export const DOCUMENTARY_RATE_ACTIVITY = 2;

export type DocumentaryEpisodeKind = "weekly" | "finale";

export type DocumentaryEpisodeView = {
  id: number;
  kind: DocumentaryEpisodeKind;
  gameweek: number | null;
  title: string;
  biggestShock: string;
  worstDecision: string;
  dramaticOvertake: string;
  quote: {
    messageId: number | null;
    body: string;
    managerName: string;
    reactionCount: number;
  } | null;
  cliffhanger: string;
  finaleSummary: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  myRating: number | null;
  generatedAt: string;
};

export type DocumentaryShelf = {
  featured: DocumentaryEpisodeView | null;
  episodes: DocumentaryEpisodeView[];
  finale: DocumentaryEpisodeView | null;
};
