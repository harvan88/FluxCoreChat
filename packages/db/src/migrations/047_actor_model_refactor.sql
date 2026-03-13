-- Migration 047: Actor Model Refactor
-- Moves relationships from account_a_id/account_b_id to actor_a_id/actor_b_id
-- Fixes message sender attribution with from_actor_id
-- Already applied to live DB on 2026-03-06

-- 1. messages: Change to_actor_id FK from fluxcore_actors to actors
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_to_actor_id_fluxcore_actors_id_fk;
ALTER TABLE messages ADD CONSTRAINT messages_to_actor_id_actors_id_fk FOREIGN KEY (to_actor_id) REFERENCES actors(id);

-- 2. relationships: Add actor_a_id/actor_b_id columns
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS actor_a_id uuid REFERENCES actors(id);
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS actor_b_id uuid REFERENCES actors(id);

-- 3. Populate actor columns from existing account columns
UPDATE relationships r SET actor_a_id = (SELECT a.id FROM actors a WHERE a.account_id = r.account_a_id LIMIT 1)
WHERE r.actor_a_id IS NULL;
UPDATE relationships r SET actor_b_id = (SELECT a.id FROM actors a WHERE a.account_id = r.account_b_id LIMIT 1)
WHERE r.actor_b_id IS NULL;

-- 4. Delete self-referencing relationships (data integrity)
DELETE FROM relationships WHERE actor_a_id = actor_b_id;

-- 5. Make actor columns NOT NULL
ALTER TABLE relationships ALTER COLUMN actor_a_id SET NOT NULL;
ALTER TABLE relationships ALTER COLUMN actor_b_id SET NOT NULL;

-- 6. Drop old FK constraints and columns
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS no_self_relationship;
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_account_a_id_accounts_id_fk;
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_account_b_id_accounts_id_fk;
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_actor_id_fkey;
DROP INDEX IF EXISTS idx_relationships_accounts;
DROP INDEX IF EXISTS idx_relationships_actor_id;
ALTER TABLE relationships DROP COLUMN IF EXISTS account_a_id;
ALTER TABLE relationships DROP COLUMN IF EXISTS account_b_id;
ALTER TABLE relationships DROP COLUMN IF EXISTS actor_id;

-- 7. Add new constraint and index
ALTER TABLE relationships ADD CONSTRAINT no_self_relationship CHECK (actor_a_id <> actor_b_id);
CREATE INDEX IF NOT EXISTS idx_relationships_actors ON relationships(actor_a_id, actor_b_id);
