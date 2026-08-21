CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_manager_id" integer NOT NULL,
	"actor_manager_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_manager_id_managers_id_fk" FOREIGN KEY ("recipient_manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_manager_id_managers_id_fk" FOREIGN KEY ("actor_manager_id") REFERENCES "public"."managers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_manager_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_manager_id","read_at");
--> statement-breakpoint
-- Enable Supabase Realtime for live toast / badge updates (no-op if not Supabase).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN undefined_object THEN null;
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Optional RLS so Realtime clients can subscribe to their own rows.
-- App reads/writes still go through DATABASE_URL (bypasses RLS).
DO $$ BEGIN
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE POLICY notifications_select_own ON notifications
    FOR SELECT TO authenticated
    USING (
      recipient_manager_id IN (
        SELECT manager_id FROM manager_accounts WHERE user_id = (auth.uid())::text
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN null;
END $$;
