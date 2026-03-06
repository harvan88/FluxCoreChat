-- 044: Add UNIQUE constraint on accounts.alias
-- Prerequisite for public profile feature: alias is identity, must be unique system-wide.
-- Nullable aliases are allowed (not all accounts have one yet).

-- First, check for duplicates and resolve them before adding constraint
DO $$
DECLARE
  dup RECORD;
  counter INT;
BEGIN
  FOR dup IN
    SELECT alias, array_agg(id ORDER BY created_at ASC) AS ids
    FROM accounts
    WHERE alias IS NOT NULL
    GROUP BY alias
    HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    -- Keep the first (oldest) one, rename the rest
    FOR i IN 2..array_length(dup.ids, 1)
    LOOP
      UPDATE accounts SET alias = dup.alias || '-dup-' || counter WHERE id = dup.ids[i];
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Now safe to add the unique constraint
ALTER TABLE accounts ADD CONSTRAINT accounts_alias_unique UNIQUE (alias);
