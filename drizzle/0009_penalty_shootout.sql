CREATE TABLE IF NOT EXISTS "penalty_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"challenger_id" integer NOT NULL,
	"opponent_id" integer,
	"challenger_score" integer DEFAULT 0 NOT NULL,
	"opponent_score" integer DEFAULT 0 NOT NULL,
	"winner_id" integer,
	"current_round" integer DEFAULT 1 NOT NULL,
	"max_rounds" integer DEFAULT 5 NOT NULL,
	"phase" text DEFAULT 'choosing' NOT NULL,
	"challenger_choice" text,
	"opponent_choice" text,
	"rounds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "penalty_matches" ADD CONSTRAINT "penalty_matches_challenger_id_managers_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "penalty_matches" ADD CONSTRAINT "penalty_matches_opponent_id_managers_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "penalty_matches" ADD CONSTRAINT "penalty_matches_winner_id_managers_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
