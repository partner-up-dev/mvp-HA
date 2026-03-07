CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN "id_v2" uuid;
--> statement-breakpoint
UPDATE "users"
SET "id_v2" = gen_random_uuid()
WHERE "id_v2" IS NULL;
--> statement-breakpoint

ALTER TABLE "partner_requests" ADD COLUMN "created_by_v2" uuid;
--> statement-breakpoint
UPDATE "partner_requests" AS pr
SET "created_by_v2" = u."id_v2"
FROM "users" AS u
WHERE pr."created_by" = u."id";
--> statement-breakpoint

ALTER TABLE "partners" ADD COLUMN "user_id_v2" uuid;
--> statement-breakpoint
UPDATE "partners" AS p
SET "user_id_v2" = u."id_v2"
FROM "users" AS u
WHERE p."user_id" = u."id";
--> statement-breakpoint

ALTER TABLE "notification_deliveries" ADD COLUMN "user_id_v2" uuid;
--> statement-breakpoint
UPDATE "notification_deliveries" AS nd
SET "user_id_v2" = u."id_v2"
FROM "users" AS u
WHERE nd."user_id" = u."id";
--> statement-breakpoint

ALTER TABLE "partner_requests" DROP CONSTRAINT IF EXISTS "partner_requests_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "partners" DROP CONSTRAINT IF EXISTS "partners_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_deliveries" DROP CONSTRAINT IF EXISTS "notification_deliveries_user_id_users_id_fk";
--> statement-breakpoint

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_pkey";
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "id" TO "legacy_id";
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "id_v2" TO "id";
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
--> statement-breakpoint

ALTER TABLE "partner_requests" DROP COLUMN "created_by";
--> statement-breakpoint
ALTER TABLE "partner_requests" RENAME COLUMN "created_by_v2" TO "created_by";
--> statement-breakpoint

ALTER TABLE "partners" DROP COLUMN "user_id";
--> statement-breakpoint
ALTER TABLE "partners" RENAME COLUMN "user_id_v2" TO "user_id";
--> statement-breakpoint

ALTER TABLE "notification_deliveries" DROP COLUMN "user_id";
--> statement-breakpoint
ALTER TABLE "notification_deliveries" RENAME COLUMN "user_id_v2" TO "user_id";
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_deliveries_user_id_idx" ON "notification_deliveries" ("user_id");
--> statement-breakpoint

CREATE TABLE "user_reliability" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"reliability_join_count" integer DEFAULT 0 NOT NULL,
	"reliability_confirm_count" integer DEFAULT 0 NOT NULL,
	"reliability_attend_count" integer DEFAULT 0 NOT NULL,
	"reliability_release_count" integer DEFAULT 0 NOT NULL,
	"join_to_confirm_ratio" double precision DEFAULT 0 NOT NULL,
	"confirm_to_attend_ratio" double precision DEFAULT 0 NOT NULL,
	"release_frequency" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "user_notification_opts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"wechat_reminder_opt_in" boolean DEFAULT false NOT NULL,
	"wechat_reminder_opt_in_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

INSERT INTO "user_reliability" (
  "user_id",
  "reliability_join_count",
  "reliability_confirm_count",
  "reliability_attend_count",
  "reliability_release_count",
  "join_to_confirm_ratio",
  "confirm_to_attend_ratio",
  "release_frequency"
)
SELECT
  "id",
  "reliability_join_count",
  "reliability_confirm_count",
  "reliability_attend_count",
  "reliability_release_count",
  "join_to_confirm_ratio",
  "confirm_to_attend_ratio",
  "release_frequency"
FROM "users"
ON CONFLICT ("user_id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "user_notification_opts" (
  "user_id",
  "wechat_reminder_opt_in",
  "wechat_reminder_opt_in_at"
)
SELECT
  "id",
  "wechat_reminder_opt_in",
  "wechat_reminder_opt_in_at"
FROM "users"
ON CONFLICT ("user_id") DO NOTHING;
--> statement-breakpoint

UPDATE "jobs" AS j
SET
  "payload" = jsonb_set(j."payload", '{userId}', to_jsonb(u."id"::text), false),
  "dedupe_key" = CASE
    WHEN j."dedupe_key" IS NULL THEN NULL
    ELSE 'wechat-reminder:' || u."id"::text || ':' || (j."payload"->>'prId') || ':' || (j."payload"->>'reminderType')
  END
FROM "users" AS u
WHERE j."job_type" = 'wechat.reminder.confirmation'
  AND j."payload"->>'userId' = u."legacy_id";
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "user_reliability" ADD CONSTRAINT "user_reliability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "user_notification_opts" ADD CONSTRAINT "user_notification_opts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "users" DROP COLUMN "legacy_id";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reliability_join_count";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reliability_confirm_count";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reliability_attend_count";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "reliability_release_count";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "join_to_confirm_ratio";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "confirm_to_attend_ratio";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "release_frequency";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "wechat_reminder_opt_in";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "wechat_reminder_opt_in_at";
