ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE text[]
  USING ARRAY["role"];

UPDATE "users"
SET "role" = ARRAY['service', 'analytics']::text[]
WHERE "id" = '00000000-0000-0000-0000-000000000001'::uuid;

ALTER TABLE "users"
  ALTER COLUMN "role" SET DEFAULT ARRAY['authenticated']::text[];
