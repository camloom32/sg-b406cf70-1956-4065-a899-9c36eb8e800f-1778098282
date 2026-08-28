ALTER TABLE showcases ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;

-- Mark showcases 1-3 as used (they were used in the last game)
UPDATE showcases SET is_used = TRUE WHERE showcase_id IN (1, 2, 3);
