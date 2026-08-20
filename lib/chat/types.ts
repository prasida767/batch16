export type ChatRosterSeat = {
  managerId: number;
  displayName: string;
  avatarUrl: string | null;
  supportedTeamId: number | null;
  supportedTeamCode: number | null;
  avatarVariant: number;
  /** Claimed account in this app. */
  verified: boolean;
};

export const CHAT_CHANNEL = "dressing-room";
export const CHAT_ACTIVE_GW_SETTING = "chat_active_gameweek";
/** Messages with this many reactions (or admin-pinned) survive GW rollover. */
export const HALL_OF_FAME_MIN_REACTIONS = 3;
export const CHAT_BODY_MAX = 800;
export const CHAT_POST_ACTIVITY = 3;

export const REACTION_EMOJIS = ["🔥", "😂", "💀", "👏", "😮", "❤️"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type ChatReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type ChatMessageView = {
  id: number;
  managerId: number;
  managerName: string;
  avatarUrl: string | null;
  supportedTeamId: number | null;
  supportedTeamCode: number | null;
  avatarVariant: number;
  body: string;
  gameweek: number;
  replyToId: number | null;
  replyPreview: {
    id: number;
    managerName: string;
    body: string;
  } | null;
  pinned: boolean;
  isHallOfFame: boolean;
  isQuoteOfWeek: boolean;
  reactionCount: number;
  reactions: ChatReactionSummary[];
  createdAt: string;
};

export type ChatPresencePayload = {
  managerId: number;
  displayName: string;
  avatarUrl: string | null;
  onlineAt: number;
};

export type ChatQuoteBundle = {
  gameweek: number;
  messageId: number;
  body: string;
  managerId: number;
  managerName: string;
  reactionCount: number;
  createdAt: string;
};

/** @deprecated Prefer lib/documentary episode views. Kept for HoF grouping helpers. */
export type DocumentaryEpisode = {
  gameweek: number;
  quote: ChatQuoteBundle | null;
  hallOfFame: ChatQuoteBundle[];
};

export type QuoteOfWeek = ChatQuoteBundle;
