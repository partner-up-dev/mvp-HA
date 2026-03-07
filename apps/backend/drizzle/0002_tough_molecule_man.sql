CREATE TABLE IF NOT EXISTS "anchor_partner_requests" (
	"pr_id" bigint PRIMARY KEY NOT NULL,
	"anchor_event_id" bigint NOT NULL,
	"batch_id" bigint NOT NULL,
	"visibility_status" text DEFAULT 'VISIBLE' NOT NULL,
	"auto_hide_at" timestamp,
	"resource_booking_deadline_at" timestamp,
	"payment_model_applied" text,
	"discount_rate_applied" double precision,
	"subsidy_cap_applied" integer,
	"cancellation_policy_applied" text,
	"economic_policy_scope_applied" text,
	"economic_policy_version_applied" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_partner_requests" (
	"pr_id" bigint PRIMARY KEY NOT NULL,
	"creation_source" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anchor_partner_requests" ADD CONSTRAINT "anchor_partner_requests_pr_id_partner_requests_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."partner_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anchor_partner_requests" ADD CONSTRAINT "anchor_partner_requests_anchor_event_id_anchor_events_id_fk" FOREIGN KEY ("anchor_event_id") REFERENCES "public"."anchor_events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anchor_partner_requests" ADD CONSTRAINT "anchor_partner_requests_batch_id_anchor_event_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."anchor_event_batches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_partner_requests" ADD CONSTRAINT "community_partner_requests_pr_id_partner_requests_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."partner_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
