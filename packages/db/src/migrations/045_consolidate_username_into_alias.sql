-- 045: Consolidate username into alias — single human identity field
-- username and alias served the same purpose (unique human-readable identifier).
-- Decision: keep alias as the sole human identity, deprecate username.

-- Step 1: Backfill alias from username where alias is NULL
UPDATE accounts SET alias = username WHERE alias IS NULL;

-- Step 2: Make alias NOT NULL now that all rows have a value
ALTER TABLE accounts ALTER COLUMN alias SET NOT NULL;
