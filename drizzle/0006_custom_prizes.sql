ALTER TABLE "prize_config" ADD COLUMN IF NOT EXISTS "custom_prizes" jsonb DEFAULT '[]'::jsonb NOT NULL;
