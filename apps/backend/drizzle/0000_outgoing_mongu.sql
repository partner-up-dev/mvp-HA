CREATE TABLE IF NOT EXISTS "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
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
	"wechat_thumbnail" jsonb DEFAULT 'null'::jsonb
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
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
