ALTER TABLE "partner_requests" DROP CONSTRAINT IF EXISTS "partner_requests_anchor_event_id_anchor_events_id_fk";
--> statement-breakpoint
ALTER TABLE "partner_requests" DROP CONSTRAINT IF EXISTS "partner_requests_batch_id_anchor_event_batches_id_fk";
--> statement-breakpoint
ALTER TABLE "community_partner_requests" ADD COLUMN "raw_text" text;--> statement-breakpoint
ALTER TABLE "community_partner_requests" ADD COLUMN "budget" text;--> statement-breakpoint
INSERT INTO "community_partner_requests" (
	"pr_id",
	"raw_text",
	"budget",
	"creation_source"
)
SELECT
	pr."id",
	pr."raw_text",
	pr."budget",
	'LEGACY'
FROM "partner_requests" AS pr
WHERE pr."pr_kind" = 'COMMUNITY'
ON CONFLICT ("pr_id") DO NOTHING;
--> statement-breakpoint
UPDATE "community_partner_requests" AS cpr
SET
	"raw_text" = pr."raw_text",
	"budget" = pr."budget"
FROM "partner_requests" AS pr
WHERE cpr."pr_id" = pr."id"
  AND pr."pr_kind" = 'COMMUNITY';
--> statement-breakpoint
INSERT INTO "anchor_partner_requests" (
	"pr_id",
	"anchor_event_id",
	"batch_id",
	"visibility_status",
	"auto_hide_at",
	"resource_booking_deadline_at",
	"payment_model_applied",
	"discount_rate_applied",
	"subsidy_cap_applied",
	"cancellation_policy_applied",
	"economic_policy_scope_applied",
	"economic_policy_version_applied"
)
SELECT
	pr."id",
	pr."anchor_event_id",
	pr."batch_id",
	COALESCE(pr."visibility_status", 'VISIBLE'),
	pr."auto_hide_at",
	pr."resource_booking_deadline_at",
	pr."payment_model_applied",
	pr."discount_rate_applied",
	pr."subsidy_cap_applied",
	pr."cancellation_policy_applied",
	pr."economic_policy_scope_applied",
	pr."economic_policy_version_applied"
FROM "partner_requests" AS pr
WHERE pr."pr_kind" = 'ANCHOR'
  AND pr."anchor_event_id" IS NOT NULL
  AND pr."batch_id" IS NOT NULL
ON CONFLICT ("pr_id") DO NOTHING;
--> statement-breakpoint
UPDATE "anchor_partner_requests" AS apr
SET
	"anchor_event_id" = pr."anchor_event_id",
	"batch_id" = pr."batch_id",
	"visibility_status" = COALESCE(pr."visibility_status", 'VISIBLE'),
	"auto_hide_at" = pr."auto_hide_at",
	"resource_booking_deadline_at" = pr."resource_booking_deadline_at",
	"payment_model_applied" = pr."payment_model_applied",
	"discount_rate_applied" = pr."discount_rate_applied",
	"subsidy_cap_applied" = pr."subsidy_cap_applied",
	"cancellation_policy_applied" = pr."cancellation_policy_applied",
	"economic_policy_scope_applied" = pr."economic_policy_scope_applied",
	"economic_policy_version_applied" = pr."economic_policy_version_applied"
FROM "partner_requests" AS pr
WHERE apr."pr_id" = pr."id"
  AND pr."pr_kind" = 'ANCHOR'
  AND pr."anchor_event_id" IS NOT NULL
  AND pr."batch_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "community_partner_requests" ALTER COLUMN "raw_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "raw_text";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "budget";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "anchor_event_id";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "batch_id";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "visibility_status";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "auto_hide_at";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "resource_booking_deadline_at";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "payment_model_applied";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "discount_rate_applied";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "subsidy_cap_applied";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "cancellation_policy_applied";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "economic_policy_scope_applied";--> statement-breakpoint
ALTER TABLE "partner_requests" DROP COLUMN IF EXISTS "economic_policy_version_applied";
