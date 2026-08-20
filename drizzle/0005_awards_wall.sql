CREATE TABLE IF NOT EXISTS "weekly_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"gameweek" integer NOT NULL,
	"award_key" text NOT NULL,
	"title" text NOT NULL,
	"manager_id" integer,
	"detail" text,
	"is_auto" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wall_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" integer NOT NULL,
	"body" text NOT NULL,
	"parent_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "weekly_awards" ADD CONSTRAINT "weekly_awards_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_parent_id_wall_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_awards_gw_key_idx" ON "weekly_awards" USING btree ("gameweek","award_key");
