import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type CustomPrizeConfig = {
  id: string;
  label: string;
  amount: string;
};

export const managers = pgTable(
  "managers",
  {
    id: serial("id").primaryKey(),
    /** Null for historical-only managers imported from Excel. */
    fplEntryId: integer("fpl_entry_id").unique(),
    /** Stable key used to merge name spelling variants. */
    canonicalKey: text("canonical_key").notNull().unique(),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    /** FPL bootstrap team id of the club this manager supports. */
    supportedTeamId: integer("supported_team_id"),
    /** PL badge code for crest URL (stable across seasons). */
    supportedTeamCode: integer("supported_team_code"),
    /** Visual variant 0–7 for the animated club avatar. */
    avatarVariant: integer("avatar_variant").notNull().default(0),
    /** Separate from money pot — fun / engagement score. */
    activityPoints: integer("activity_points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("managers_activity_points_idx")
      .on(table.activityPoints)
      .where(sql`${table.fplEntryId} is not null`),
  ],
);

export const prizeConfig = pgTable("prize_config", {
  id: serial("id").primaryKey(),
  entryFee: numeric("entry_fee", { precision: 10, scale: 2 }).notNull(),
  weeklyWinner: numeric("weekly_winner", { precision: 10, scale: 2 }).notNull(),
  overall1st: numeric("overall_1st", { precision: 10, scale: 2 }).notNull(),
  overall2nd: numeric("overall_2nd", { precision: 10, scale: 2 }).notNull(),
  lastPlace: numeric("last_place", { precision: 10, scale: 2 }).notNull(),
  /** Extra named prizes (e.g. Most Improved) — amounts reserved from the pot. */
  customPrizes: jsonb("custom_prizes")
    .$type<CustomPrizeConfig[]>()
    .notNull()
    .default([]),
  currency: text("currency").notNull().default("NPR"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const weeklyResults = pgTable(
  "weekly_results",
  {
    id: serial("id").primaryKey(),
    gameweek: integer("gameweek").notNull(),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
    rank: integer("rank").notNull(),
    isWinner: boolean("is_winner").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("weekly_results_gameweek_manager_idx").on(
      table.gameweek,
      table.managerId,
    ),
    index("weekly_results_winners_idx")
      .on(table.gameweek)
      .where(sql`${table.isWinner} = true`),
  ],
);

export const balances = pgTable(
  "balances",
  {
    id: serial("id").primaryKey(),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    currentBalance: numeric("current_balance", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    /** True once the manager has transferred the full entry fee. */
    entryFeePaid: boolean("entry_fee_paid").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("balances_manager_id_idx").on(table.managerId),
  ],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/**
 * Append-only log of activity point changes.
 * Use `awardActivityPoints()` so totals and history stay in sync.
 */
export const activityEvents = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  managerId: integer("manager_id")
    .notNull()
    .references(() => managers.id, { onDelete: "cascade" }),
  /** Positive to award, negative to subtract. */
  delta: integer("delta").notNull(),
  /** Human-readable note shown in admin history. */
  reason: text("reason").notNull(),
  /**
   * Machine key for future automation, e.g. `manual`, `weekly_win`.
   * Keeps automatic awards discoverable without parsing free text.
   */
  actionKey: text("action_key").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("activity_events_created_idx").on(table.createdAt),
  index("activity_events_manager_created_idx").on(
    table.managerId,
    table.createdAt,
  ),
]);

/**
 * Links a Supabase Auth user to a league manager after name + team validation.
 * One account per manager; one manager per account.
 */
export const managerAccounts = pgTable(
  "manager_accounts",
  {
    id: serial("id").primaryKey(),
    /** Supabase Auth user UUID. */
    userId: text("user_id").notNull(),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("manager_accounts_user_id_idx").on(table.userId),
    uniqueIndex("manager_accounts_manager_id_idx").on(table.managerId),
  ],
);

/**
 * Side bets between managers. Stake is informational only (no pot movement).
 * Status: pending → accepted | declined → completed
 */
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id")
    .notNull()
    .references(() => managers.id, { onDelete: "cascade" }),
  opponentId: integer("opponent_id")
    .notNull()
    .references(() => managers.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  /** Optional stake in NPR — tracking only. */
  stakeNpr: numeric("stake_npr", { precision: 10, scale: 2 }),
  gameweek: integer("gameweek"),
  /** pending | accepted | declined | completed | cancelled */
  status: text("status").notNull().default("pending"),
  winnerId: integer("winner_id").references(() => managers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [
  index("challenges_status_created_idx").on(table.status, table.createdAt),
  index("challenges_opponent_status_idx").on(table.opponentId, table.status),
  index("challenges_creator_status_idx").on(table.creatorId, table.status),
]);

/** Auto + manual weekly fun awards (separate from money prizes). */
export const weeklyAwards = pgTable(
  "weekly_awards",
  {
    id: serial("id").primaryKey(),
    gameweek: integer("gameweek").notNull(),
    /** highest_score | best_differential | biggest_climb | worst_week | custom_* */
    awardKey: text("award_key").notNull(),
    title: text("title").notNull(),
    managerId: integer("manager_id").references(() => managers.id, {
      onDelete: "set null",
    }),
    detail: text("detail"),
    isAuto: boolean("is_auto").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("weekly_awards_gw_key_idx").on(table.gameweek, table.awardKey),
    index("weekly_awards_manager_idx")
      .on(table.managerId)
      .where(sql`${table.managerId} is not null`),
  ],
);

/** League trash-talk wall. Soft-delete via deletedAt. Legacy — prefer chat_messages. */
export const wallPosts = pgTable(
  "wall_posts",
  {
    id: serial("id").primaryKey(),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    parentId: integer("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("wall_posts_feed_idx")
      .on(table.createdAt)
      .where(sql`${table.deletedAt} is null`),
  ],
);

/**
 * Dressing Room league chat.
 * Active messages live per gameweek; high-reaction / pinned become Hall of Fame.
 */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    replyToId: integer("reply_to_id"),
    gameweek: integer("gameweek").notNull(),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
    pinnedBy: integer("pinned_by").references(() => managers.id, {
      onDelete: "set null",
    }),
    isHallOfFame: boolean("is_hall_of_fame").notNull().default(false),
    isQuoteOfWeek: boolean("is_quote_of_week").notNull().default(false),
    /** Denormalized count of reaction rows for sorting / archival. */
    reactionCount: integer("reaction_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("chat_messages_active_gw_created_idx")
      .on(table.gameweek, table.createdAt)
      .where(
        sql`${table.deletedAt} is null and ${table.isHallOfFame} = false`,
      ),
    index("chat_messages_pinned_gw_idx")
      .on(table.gameweek, table.pinnedAt)
      .where(
        sql`${table.deletedAt} is null and ${table.pinnedAt} is not null and ${table.isHallOfFame} = false`,
      ),
    index("chat_messages_hof_reactions_idx")
      .on(table.gameweek, table.reactionCount)
      .where(sql`${table.isHallOfFame} = true`),
  ],
);

export const chatReactions = pgTable(
  "chat_reactions",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("chat_reactions_unique_idx").on(
      table.messageId,
      table.managerId,
      table.emoji,
    ),
  ],
);

/** Cinematic Season Documentary episodes — one per finished GW (+ season finale). */
export const documentaryEpisodes = pgTable("documentary_episodes", {
  id: serial("id").primaryKey(),
  /** weekly | finale */
  kind: text("kind").notNull().default("weekly"),
  /** Null for season finale. */
  gameweek: integer("gameweek"),
  title: text("title").notNull(),
  biggestShock: text("biggest_shock").notNull(),
  worstDecision: text("worst_decision").notNull(),
  dramaticOvertake: text("dramatic_overtake").notNull(),
  quoteMessageId: integer("quote_message_id").references(() => chatMessages.id, {
    onDelete: "set null",
  }),
  quoteBody: text("quote_body"),
  quoteManagerName: text("quote_manager_name"),
  quoteReactionCount: integer("quote_reaction_count").notNull().default(0),
  cliffhanger: text("cliffhanger").notNull(),
  /** Extra narrative for the season finale. */
  finaleSummary: text("finale_summary"),
  ratingSum: integer("rating_sum").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const documentaryRatings = pgTable(
  "documentary_ratings",
  {
    id: serial("id").primaryKey(),
    episodeId: integer("episode_id")
      .notNull()
      .references(() => documentaryEpisodes.id, { onDelete: "cascade" }),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    /** 1–5 */
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("documentary_ratings_unique_idx").on(
      table.episodeId,
      table.managerId,
    ),
    index("documentary_ratings_manager_episode_idx").on(
      table.managerId,
      table.episodeId,
    ),
  ],
);

/** In-app notifications for managers (Baaji, chat, awards, etc.). */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    recipientManagerId: integer("recipient_manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    actorManagerId: integer("actor_manager_id").references(() => managers.id, {
      onDelete: "set null",
    }),
    /** e.g. baaji_challenge | chat_reply | taunt | awards_published */
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_recipient_created_idx").on(
      table.recipientManagerId,
      table.createdAt,
    ),
    index("notifications_recipient_unread_idx").on(
      table.recipientManagerId,
      table.readAt,
    ),
    index("notifications_recipient_unread_partial_idx")
      .on(table.recipientManagerId, table.createdAt)
      .where(sql`${table.readAt} is null`),
  ],
);

export type PenaltyDirection = "left" | "center" | "right";

export type PenaltyRoundRecord = {
  round: number;
  /** Who took the kick. Null = computer in solo. */
  shooterId: number | null;
  keeperId: number | null;
  shot: PenaltyDirection;
  dive: PenaltyDirection;
  scored: boolean;
};

/**
 * Penalty Shootout matches — solo vs CPU or multiplayer challenges.
 * Status: pending → active | declined | cancelled → completed
 */
export const penaltyMatches = pgTable("penalty_matches", {
  id: serial("id").primaryKey(),
  /** solo | multiplayer */
  mode: text("mode").notNull(),
  /**
   * pending (awaiting accept) | active | completed | declined | cancelled
   */
  status: text("status").notNull().default("pending"),
  challengerId: integer("challenger_id")
    .notNull()
    .references(() => managers.id, { onDelete: "cascade" }),
  /** Null for solo (CPU opponent). */
  opponentId: integer("opponent_id").references(() => managers.id, {
    onDelete: "cascade",
  }),
  challengerScore: integer("challenger_score").notNull().default(0),
  opponentScore: integer("opponent_score").notNull().default(0),
  winnerId: integer("winner_id").references(() => managers.id, {
    onDelete: "set null",
  }),
  currentRound: integer("current_round").notNull().default(1),
  maxRounds: integer("max_rounds").notNull().default(5),
  /** choosing | revealing | finished */
  phase: text("phase").notNull().default("choosing"),
  /** Locked-in choices for the current round (cleared after reveal). */
  challengerChoice: text("challenger_choice"),
  opponentChoice: text("opponent_choice"),
  rounds: jsonb("rounds").$type<PenaltyRoundRecord[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  /** e.g. 2024-25 */
  label: text("label").notNull().unique(),
  /** e.g. FPL 2024-25 */
  name: text("name").notNull(),
  startYear: integer("start_year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const weeklyWinners = pgTable(
  "weekly_winners",
  {
    id: serial("id").primaryKey(),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    gameweek: integer("gameweek").notNull(),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    points: integer("points"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("weekly_winners_season_gw_manager_idx").on(
      table.seasonId,
      table.gameweek,
      table.managerId,
    ),
  ],
);

export const seasonPrizes = pgTable(
  "season_prizes",
  {
    id: serial("id").primaryKey(),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    /** overall_1st | overall_2nd | consolation | highest_gw | lucky_Nth */
    prizeType: text("prize_type").notNull(),
    managerId: integer("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("season_prizes_season_type_manager_idx").on(
      table.seasonId,
      table.prizeType,
      table.managerId,
    ),
  ],
);

export const managersRelations = relations(managers, ({ many, one }) => ({
  weeklyResults: many(weeklyResults),
  weeklyWinners: many(weeklyWinners),
  seasonPrizes: many(seasonPrizes),
  activityEvents: many(activityEvents),
  challengesCreated: many(challenges, { relationName: "challenge_creator" }),
  challengesReceived: many(challenges, { relationName: "challenge_opponent" }),
  weeklyAwards: many(weeklyAwards),
  wallPosts: many(wallPosts),
  chatMessages: many(chatMessages),
  chatReactions: many(chatReactions),
  documentaryRatings: many(documentaryRatings),
  penaltyMatchesChallenged: many(penaltyMatches, {
    relationName: "penalty_challenger",
  }),
  penaltyMatchesReceived: many(penaltyMatches, {
    relationName: "penalty_opponent",
  }),
  balance: one(balances, {
    fields: [managers.id],
    references: [balances.managerId],
  }),
}));

export const penaltyMatchesRelations = relations(penaltyMatches, ({ one }) => ({
  challenger: one(managers, {
    fields: [penaltyMatches.challengerId],
    references: [managers.id],
    relationName: "penalty_challenger",
  }),
  opponent: one(managers, {
    fields: [penaltyMatches.opponentId],
    references: [managers.id],
    relationName: "penalty_opponent",
  }),
  winner: one(managers, {
    fields: [penaltyMatches.winnerId],
    references: [managers.id],
  }),
}));

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  manager: one(managers, {
    fields: [activityEvents.managerId],
    references: [managers.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ one }) => ({
  creator: one(managers, {
    fields: [challenges.creatorId],
    references: [managers.id],
    relationName: "challenge_creator",
  }),
  opponent: one(managers, {
    fields: [challenges.opponentId],
    references: [managers.id],
    relationName: "challenge_opponent",
  }),
  winner: one(managers, {
    fields: [challenges.winnerId],
    references: [managers.id],
  }),
}));

export const weeklyAwardsRelations = relations(weeklyAwards, ({ one }) => ({
  manager: one(managers, {
    fields: [weeklyAwards.managerId],
    references: [managers.id],
  }),
}));

export const wallPostsRelations = relations(wallPosts, ({ one }) => ({
  manager: one(managers, {
    fields: [wallPosts.managerId],
    references: [managers.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  manager: one(managers, {
    fields: [chatMessages.managerId],
    references: [managers.id],
  }),
  pinnedByManager: one(managers, {
    fields: [chatMessages.pinnedBy],
    references: [managers.id],
    relationName: "chat_pin_admin",
  }),
  reactions: many(chatReactions),
}));

export const chatReactionsRelations = relations(chatReactions, ({ one }) => ({
  message: one(chatMessages, {
    fields: [chatReactions.messageId],
    references: [chatMessages.id],
  }),
  manager: one(managers, {
    fields: [chatReactions.managerId],
    references: [managers.id],
  }),
}));

export const documentaryEpisodesRelations = relations(
  documentaryEpisodes,
  ({ one, many }) => ({
    quoteMessage: one(chatMessages, {
      fields: [documentaryEpisodes.quoteMessageId],
      references: [chatMessages.id],
    }),
    ratings: many(documentaryRatings),
  }),
);

export const documentaryRatingsRelations = relations(
  documentaryRatings,
  ({ one }) => ({
    episode: one(documentaryEpisodes, {
      fields: [documentaryRatings.episodeId],
      references: [documentaryEpisodes.id],
    }),
    manager: one(managers, {
      fields: [documentaryRatings.managerId],
      references: [managers.id],
    }),
  }),
);

export const weeklyResultsRelations = relations(weeklyResults, ({ one }) => ({
  manager: one(managers, {
    fields: [weeklyResults.managerId],
    references: [managers.id],
  }),
}));

export const balancesRelations = relations(balances, ({ one }) => ({
  manager: one(managers, {
    fields: [balances.managerId],
    references: [managers.id],
  }),
}));

export const seasonsRelations = relations(seasons, ({ many }) => ({
  weeklyWinners: many(weeklyWinners),
  seasonPrizes: many(seasonPrizes),
}));

export const weeklyWinnersRelations = relations(weeklyWinners, ({ one }) => ({
  season: one(seasons, {
    fields: [weeklyWinners.seasonId],
    references: [seasons.id],
  }),
  manager: one(managers, {
    fields: [weeklyWinners.managerId],
    references: [managers.id],
  }),
}));

export const seasonPrizesRelations = relations(seasonPrizes, ({ one }) => ({
  season: one(seasons, {
    fields: [seasonPrizes.seasonId],
    references: [seasons.id],
  }),
  manager: one(managers, {
    fields: [seasonPrizes.managerId],
    references: [managers.id],
  }),
}));

export type Manager = typeof managers.$inferSelect;
export type NewManager = typeof managers.$inferInsert;

export type ManagerAccount = typeof managerAccounts.$inferSelect;
export type NewManagerAccount = typeof managerAccounts.$inferInsert;

export type PrizeConfig = typeof prizeConfig.$inferSelect;
export type NewPrizeConfig = typeof prizeConfig.$inferInsert;

export type WeeklyResult = typeof weeklyResults.$inferSelect;
export type NewWeeklyResult = typeof weeklyResults.$inferInsert;

export type Balance = typeof balances.$inferSelect;
export type NewBalance = typeof balances.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;

export type WeeklyAward = typeof weeklyAwards.$inferSelect;
export type NewWeeklyAward = typeof weeklyAwards.$inferInsert;

export type WallPost = typeof wallPosts.$inferSelect;
export type NewWallPost = typeof wallPosts.$inferInsert;

export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type ChatReactionRow = typeof chatReactions.$inferSelect;
export type NewChatReaction = typeof chatReactions.$inferInsert;

export type DocumentaryEpisodeRow = typeof documentaryEpisodes.$inferSelect;
export type NewDocumentaryEpisode = typeof documentaryEpisodes.$inferInsert;

export type DocumentaryRatingRow = typeof documentaryRatings.$inferSelect;
export type NewDocumentaryRating = typeof documentaryRatings.$inferInsert;

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type PenaltyMatch = typeof penaltyMatches.$inferSelect;
export type NewPenaltyMatch = typeof penaltyMatches.$inferInsert;

export type Season = typeof seasons.$inferSelect;
export type NewSeason = typeof seasons.$inferInsert;

export type WeeklyWinner = typeof weeklyWinners.$inferSelect;
export type NewWeeklyWinner = typeof weeklyWinners.$inferInsert;

export type SeasonPrize = typeof seasonPrizes.$inferSelect;
export type NewSeasonPrize = typeof seasonPrizes.$inferInsert;
