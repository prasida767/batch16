CREATE TABLE IF NOT EXISTS "documentary_episodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'weekly' NOT NULL,
	"gameweek" integer,
	"title" text NOT NULL,
	"biggest_shock" text NOT NULL,
	"worst_decision" text NOT NULL,
	"dramatic_overtake" text NOT NULL,
	"quote_message_id" integer,
	"quote_body" text,
	"quote_manager_name" text,
	"quote_reaction_count" integer DEFAULT 0 NOT NULL,
	"cliffhanger" text NOT NULL,
	"finale_summary" text,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documentary_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"episode_id" integer NOT NULL,
	"manager_id" integer NOT NULL,
	"stars" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documentary_episodes" ADD CONSTRAINT "documentary_episodes_quote_message_id_chat_messages_id_fk" FOREIGN KEY ("quote_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documentary_ratings" ADD CONSTRAINT "documentary_ratings_episode_id_documentary_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."documentary_episodes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documentary_ratings" ADD CONSTRAINT "documentary_ratings_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "documentary_episodes_weekly_gw_idx" ON "documentary_episodes" USING btree ("gameweek") WHERE "kind" = 'weekly';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "documentary_episodes_finale_idx" ON "documentary_episodes" USING btree ("kind") WHERE "kind" = 'finale';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "documentary_ratings_unique_idx" ON "documentary_ratings" USING btree ("episode_id","manager_id");
