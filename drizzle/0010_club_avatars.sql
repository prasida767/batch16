ALTER TABLE "managers" ADD COLUMN "supported_team_id" integer;
--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN "supported_team_code" integer;
--> statement-breakpoint
ALTER TABLE "managers" ADD COLUMN "avatar_variant" integer DEFAULT 0 NOT NULL;
