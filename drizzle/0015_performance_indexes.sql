-- Performance indexes for hot WHERE / JOIN / ORDER BY paths.
-- Safe for production: IF NOT EXISTS, no data changes.

-- Baaji / challenges: status board + per-manager inbox filters
CREATE INDEX IF NOT EXISTS "challenges_status_created_idx"
  ON "challenges" USING btree ("status", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "challenges_opponent_status_idx"
  ON "challenges" USING btree ("opponent_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "challenges_creator_status_idx"
  ON "challenges" USING btree ("creator_id", "status");
--> statement-breakpoint

-- Penalty shootout: lobby inbox, active matches, history
CREATE INDEX IF NOT EXISTS "penalty_matches_status_created_idx"
  ON "penalty_matches" USING btree ("status", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "penalty_matches_challenger_status_idx"
  ON "penalty_matches" USING btree ("challenger_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "penalty_matches_opponent_status_idx"
  ON "penalty_matches" USING btree ("opponent_id", "status")
  WHERE "opponent_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "penalty_matches_completed_idx"
  ON "penalty_matches" USING btree ("completed_at" DESC)
  WHERE "status" = 'completed';
--> statement-breakpoint

-- Activity feed + per-manager history
CREATE INDEX IF NOT EXISTS "activity_events_created_idx"
  ON "activity_events" USING btree ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_events_manager_created_idx"
  ON "activity_events" USING btree ("manager_id", "created_at" DESC);
--> statement-breakpoint

-- Weekly winners lookup (celebration / admin overrides)
CREATE INDEX IF NOT EXISTS "weekly_results_winners_idx"
  ON "weekly_results" USING btree ("gameweek")
  WHERE "is_winner" = true;
--> statement-breakpoint

-- Dressing Room: chronological active feed + pinned strip
CREATE INDEX IF NOT EXISTS "chat_messages_active_gw_created_idx"
  ON "chat_messages" USING btree ("gameweek", "created_at" DESC)
  WHERE "deleted_at" IS NULL AND "is_hall_of_fame" = false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_pinned_gw_idx"
  ON "chat_messages" USING btree ("gameweek", "pinned_at" DESC)
  WHERE "deleted_at" IS NULL AND "pinned_at" IS NOT NULL AND "is_hall_of_fame" = false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_hof_reactions_idx"
  ON "chat_messages" USING btree ("gameweek", "reaction_count" DESC)
  WHERE "is_hall_of_fame" = true;
--> statement-breakpoint

-- Legacy wall feed
CREATE INDEX IF NOT EXISTS "wall_posts_feed_idx"
  ON "wall_posts" USING btree ("created_at" DESC)
  WHERE "deleted_at" IS NULL;
--> statement-breakpoint

-- Activity leaderboard ordering
CREATE INDEX IF NOT EXISTS "managers_activity_points_idx"
  ON "managers" USING btree ("activity_points" DESC)
  WHERE "fpl_entry_id" IS NOT NULL;
--> statement-breakpoint

-- Awards by manager
CREATE INDEX IF NOT EXISTS "weekly_awards_manager_idx"
  ON "weekly_awards" USING btree ("manager_id")
  WHERE "manager_id" IS NOT NULL;
--> statement-breakpoint

-- Unread notification badge / count (partial = smaller + faster)
CREATE INDEX IF NOT EXISTS "notifications_recipient_unread_partial_idx"
  ON "notifications" USING btree ("recipient_manager_id", "created_at" DESC)
  WHERE "read_at" IS NULL;
--> statement-breakpoint

-- Documentary "my rating" lookups by viewer
CREATE INDEX IF NOT EXISTS "documentary_ratings_manager_episode_idx"
  ON "documentary_ratings" USING btree ("manager_id", "episode_id");
--> statement-breakpoint

-- Past seasons: winners by season ordered by GW
CREATE INDEX IF NOT EXISTS "weekly_winners_season_gw_idx"
  ON "weekly_winners" USING btree ("season_id", "gameweek");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "season_prizes_season_idx"
  ON "season_prizes" USING btree ("season_id");
