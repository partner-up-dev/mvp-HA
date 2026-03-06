ALTER TABLE "users" ALTER COLUMN "open_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_requests" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_hash" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
