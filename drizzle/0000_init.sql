CREATE TABLE "balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" integer NOT NULL,
	"current_balance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"fpl_entry_id" integer NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managers_fpl_entry_id_unique" UNIQUE("fpl_entry_id")
);
--> statement-breakpoint
CREATE TABLE "prize_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_fee" numeric(10, 2) NOT NULL,
	"weekly_winner" numeric(10, 2) NOT NULL,
	"overall_1st" numeric(10, 2) NOT NULL,
	"overall_2nd" numeric(10, 2) NOT NULL,
	"last_place" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"gameweek" integer NOT NULL,
	"manager_id" integer NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"rank" integer NOT NULL,
	"is_winner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "balances" ADD CONSTRAINT "balances_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_results" ADD CONSTRAINT "weekly_results_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "balances_manager_id_idx" ON "balances" USING btree ("manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_results_gameweek_manager_idx" ON "weekly_results" USING btree ("gameweek","manager_id");