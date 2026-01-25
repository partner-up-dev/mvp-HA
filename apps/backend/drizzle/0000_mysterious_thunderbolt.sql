CREATE TABLE IF NOT EXISTS "partner_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_text" text NOT NULL,
	"parsed" jsonb NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"pin_hash" text NOT NULL,
	"participants" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
