ALTER TABLE "anchor_events"
  ADD COLUMN IF NOT EXISTS "default_confirmation_start_offset_minutes" integer,
  ADD COLUMN IF NOT EXISTS "default_confirmation_end_offset_minutes" integer,
  ADD COLUMN IF NOT EXISTS "default_join_lock_offset_minutes" integer;

UPDATE "anchor_events"
SET
  "default_confirmation_start_offset_minutes" = COALESCE("default_confirmation_start_offset_minutes", 120),
  "default_confirmation_end_offset_minutes" = COALESCE("default_confirmation_end_offset_minutes", 30),
  "default_join_lock_offset_minutes" = COALESCE("default_join_lock_offset_minutes", 30)
WHERE
  "default_confirmation_start_offset_minutes" IS NULL
  OR "default_confirmation_end_offset_minutes" IS NULL
  OR "default_join_lock_offset_minutes" IS NULL;
