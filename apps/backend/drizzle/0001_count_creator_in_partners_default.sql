ALTER TABLE "partner_requests"
ALTER COLUMN "partners"
SET DEFAULT ARRAY[NULL, 1, NULL]::integer[];
