ALTER TABLE "managers" ALTER COLUMN "fpl_entry_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN "canonical_key" text;--> statement-breakpoint
UPDATE "managers" SET "canonical_key" = lower(regexp_replace(trim("display_name"), '\s+', '_', 'g')) WHERE "canonical_key" IS NULL;--> statement-breakpoint
ALTER TABLE "managers" ALTER COLUMN "canonical_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "managers_canonical_key_unique" ON "managers" ("canonical_key");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"name" text NOT NULL,
	"start_year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_label_unique" UNIQUE("label")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weekly_winners" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"gameweek" integer NOT NULL,
	"manager_id" integer NOT NULL,
	"points" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "season_prizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"prize_type" text NOT NULL,
	"manager_id" integer NOT NULL,
	"amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "weekly_winners" ADD CONSTRAINT "weekly_winners_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "weekly_winners" ADD CONSTRAINT "weekly_winners_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "season_prizes" ADD CONSTRAINT "season_prizes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "season_prizes" ADD CONSTRAINT "season_prizes_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_winners_season_gw_manager_idx" ON "weekly_winners" USING btree ("season_id","gameweek","manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "season_prizes_season_type_manager_idx" ON "season_prizes" USING btree ("season_id","prize_type","manager_id");
