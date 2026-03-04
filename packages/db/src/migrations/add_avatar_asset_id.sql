-- Migration: Add avatarAssetId to accounts table
-- Purpose: Complete migration from avatarUrl to asset-based avatar system

-- Add avatarAssetId column to accounts table
ALTER TABLE accounts 
ADD COLUMN avatar_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_accounts_avatar_asset_id ON accounts(avatar_asset_id);

-- Migrate existing avatarUrl data to assets
-- This migration creates assets for existing avatar URLs and updates accounts.avatar_asset_id
DO $$
DECLARE
    account_record RECORD;
    asset_id UUID;
BEGIN
    FOR account_record IN 
        SELECT id, profile->>'avatarUrl' as avatar_url 
        FROM accounts 
        WHERE profile->>'avatarUrl' IS NOT NULL 
        AND profile->>'avatarUrl' != ''
    LOOP
        -- Create asset record for existing avatar URL
        INSERT INTO assets (
            id,
            account_id,
            original_filename,
            mime_type,
            size_bytes,
            scope,
            status,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            account_record.id,
            'legacy_avatar_' || account_record.id,
            'image/jpeg',
            0, -- Unknown size for legacy URLs
            'profile_avatar',
            'ready',
            jsonb_build_object('source', 'migration', 'original_url', account_record.avatar_url),
            NOW(),
            NOW()
        ) RETURNING id INTO asset_id;
        
        -- Update account with new asset_id
        UPDATE accounts 
        SET avatar_asset_id = asset_id,
            updated_at = NOW()
        WHERE id = account_record.id;
    END LOOP;
END $$;

-- Update account type to include avatarAssetId
DROP TYPE IF EXISTS account_type CASCADE;
CREATE TYPE account_type AS (
    id UUID,
    owner_user_id UUID,
    username VARCHAR(100),
    display_name VARCHAR(255),
    account_type VARCHAR(20),
    profile JSONB,
    private_context TEXT,
    alias VARCHAR(100),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    allow_automated_use BOOLEAN,
    ai_include_name BOOLEAN,
    ai_include_bio BOOLEAN,
    ai_include_private_context BOOLEAN,
    avatar_asset_id UUID
);

COMMENT ON COLUMN accounts.avatar_asset_id IS 'Reference to asset in assets table for profile avatar (replaces profile.avatarUrl)';
