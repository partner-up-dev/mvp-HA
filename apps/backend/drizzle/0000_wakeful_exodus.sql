CREATE TABLE IF NOT EXISTS "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"raw_text" text NOT NULL,
	"parsed" jsonb NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"pin_hash" text NOT NULL,
	"participants" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"xiaohongshu_poster" jsonb DEFAULT 'null'::jsonb,
	"wechat_thumbnail" jsonb DEFAULT 'null'::jsonb
);
