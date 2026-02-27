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
CREATE INDEX IF NOT EXISTS "jobs_status_run_at_idx" ON "jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_lease_until_idx" ON "jobs" USING btree ("lease_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_job_type_status_idx" ON "jobs" USING btree ("job_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_active_dedupe_key_uq" ON "jobs" USING btree ("dedupe_key") WHERE "jobs"."dedupe_key" is not null and "jobs"."status" in ('PENDING', 'RETRY', 'RUNNING');