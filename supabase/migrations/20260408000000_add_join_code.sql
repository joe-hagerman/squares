-- Add join_code column (nullable first so we can backfill existing rows)
ALTER TABLE boards ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Backfill existing boards with a 6-char uppercase hex code derived from their ID.
-- New boards will get proper alphanumeric codes from the JS layer.
UPDATE boards
SET join_code = upper(left(md5(id::text), 6))
WHERE join_code IS NULL;

-- Now lock it down
ALTER TABLE boards ALTER COLUMN join_code SET NOT NULL;
ALTER TABLE boards ADD CONSTRAINT boards_join_code_unique UNIQUE (join_code);
