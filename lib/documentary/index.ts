export {
  DOCUMENTARY_RATE_ACTIVITY,
  type DocumentaryEpisodeKind,
  type DocumentaryEpisodeView,
  type DocumentaryShelf,
} from "@/lib/documentary/types";
export {
  ensureDocumentaryEpisodes,
  ensureDocumentaryEpisodesThrottled,
  generateSeasonFinaleEpisode,
  generateWeeklyDocumentaryEpisode,
  getBestChatQuoteForGameweek,
  getDocumentaryEpisodeById,
  getDocumentaryShelf,
  getLatestDocumentaryEpisode,
  listDocumentaryEpisodeViews,
  rateDocumentaryEpisode,
} from "@/lib/documentary/service";
