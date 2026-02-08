CREATE TABLE IF NOT EXISTS "partner_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"raw_text" text NOT NULL,
	"title" text,
	"type" text NOT NULL,
	"time_window" text[] DEFAULT ARRAY[NULL, NULL]::text[] NOT NULL,
	"location" text,
	"partners" integer[] DEFAULT ARRAY[NULL, 0, NULL]::integer[] NOT NULL,
	"budget" text,
	"preferences" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"notes" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"pin_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"xiaohongshu_poster" jsonb DEFAULT 'null'::jsonb,
	"wechat_thumbnail" jsonb DEFAULT 'null'::jsonb
);
CREATE TABLE IF NOT EXISTS "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
