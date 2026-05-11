ALTER TABLE "pr_messages"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp;

UPDATE "pr_messages"
SET "updated_at" = "created_at"
WHERE "updated_at" IS NULL;

ALTER TABLE "pr_messages"
  ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "pr_messages"
  ALTER COLUMN "updated_at" SET DEFAULT now();
