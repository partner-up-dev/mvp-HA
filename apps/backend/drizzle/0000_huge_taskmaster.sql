CREATE TABLE IF NOT EXISTS "anchor_event_batches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"anchor_event_id" bigint NOT NULL,
	"time_window" text[] DEFAULT ARRAY[NULL, NULL]::text[] NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anchor_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"location_pool" jsonb NOT NULL,
	"time_window_pool" jsonb NOT NULL,
	"cover_image" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"raw_text" text NOT NULL,
	"title" text,
	"type" text NOT NULL,
	"time_window" text[] DEFAULT ARRAY[NULL, NULL]::text[] NOT NULL,
	"location" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"pin_hash" text NOT NULL,
	"min_partners" integer,
	"max_partners" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"budget" text,
	"preferences" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"notes" text,
	"xiaohongshu_poster" jsonb DEFAULT 'null'::jsonb,
	"wechat_thumbnail" jsonb DEFAULT 'null'::jsonb,
	"pr_kind" text DEFAULT 'COMMUNITY' NOT NULL,
	"anchor_event_id" bigint,
	"batch_id" bigint,
	"visibility_status" text DEFAULT 'VISIBLE' NOT NULL,
	"auto_hide_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pr_id" bigint NOT NULL,
	"status" text DEFAULT 'RELEASED' NOT NULL,
	"user_id" text,
	"confirmed_at" timestamp,
	"released_at" timestamp,
	"attended_at" timestamp,
	"check_in_at" timestamp,
	"did_attend" boolean,
	"would_join_again" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"open_id" text NOT NULL,
	"nickname" text,
	"sex" integer,
	"avatar" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"reliability_join_count" integer DEFAULT 0 NOT NULL,
	"reliability_confirm_count" integer DEFAULT 0 NOT NULL,
	"reliability_attend_count" integer DEFAULT 0 NOT NULL,
	"reliability_release_count" integer DEFAULT 0 NOT NULL,
	"join_to_confirm_ratio" double precision DEFAULT 0 NOT NULL,
	"confirm_to_attend_ratio" double precision DEFAULT 0 NOT NULL,
	"release_frequency" double precision DEFAULT 0 NOT NULL,
	"wechat_reminder_opt_in" boolean DEFAULT false NOT NULL,
	"wechat_reminder_opt_in_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbox_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempted_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operation_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_status" text DEFAULT 'success' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"run_at" timestamp NOT NULL,
	"early_tolerance_ms" integer DEFAULT 0 NOT NULL,
	"late_tolerance_ms" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"lease_until" timestamp,
	"leased_by" text,
	"dedupe_key" text,
	"last_attempted_at" timestamp,
	"last_error" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_deliveries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job_id" bigint,
	"pr_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"reminder_type" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"result" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anchor_event_batches" ADD CONSTRAINT "anchor_event_batches_anchor_event_id_anchor_events_id_fk" FOREIGN KEY ("anchor_event_id") REFERENCES "public"."anchor_events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_anchor_event_id_anchor_events_id_fk" FOREIGN KEY ("anchor_event_id") REFERENCES "public"."anchor_events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_batch_id_anchor_event_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."anchor_event_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partners" ADD CONSTRAINT "partners_pr_id_partner_requests_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."partner_requests"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_event_id_domain_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."domain_events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_pr_id_partner_requests_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."partner_requests"("id") ON DELETE cascade ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "jobs_status_run_at_idx" ON "jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_lease_until_idx" ON "jobs" USING btree ("lease_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_job_type_status_idx" ON "jobs" USING btree ("job_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_active_dedupe_key_uq" ON "jobs" USING btree ("dedupe_key") WHERE "jobs"."dedupe_key" is not null and "jobs"."status" in ('PENDING', 'RETRY', 'RUNNING');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_deliveries_job_id_idx" ON "notification_deliveries" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_deliveries_pr_id_idx" ON "notification_deliveries" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_deliveries_user_id_idx" ON "notification_deliveries" USING btree ("user_id");