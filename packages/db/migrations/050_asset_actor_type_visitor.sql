-- Migration to add visitor support to actor types
ALTER TYPE asset_actor_type ADD VALUE IF NOT EXISTS 'visitor';
