-- 043_remove_profile_avatar_url.sql
-- Purpose: remove legacy profile.avatarUrl JSON keys now that avatarAssetId is the single source of truth.

BEGIN;

-- Strip avatarUrl from every profile JSON document (no-op if key absent)
UPDATE accounts
SET profile = profile - 'avatarUrl'
WHERE profile ? 'avatarUrl';

-- Document the canonical source of avatar data
COMMENT ON COLUMN accounts.avatar_asset_id IS 'Reference to assets.id for profile avatar (replaces legacy profile.avatarUrl)';

COMMIT;
