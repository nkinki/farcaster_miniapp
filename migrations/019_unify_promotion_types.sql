-- Migration: Unify promotion types and fix constraints
-- Purpose: Allow 'comment' and 'follow' action types and ensure the primary promotions table has all necessary columns.

-- 1. Update promotions table action_type constraint
ALTER TABLE promotions 
DROP CONSTRAINT IF EXISTS promotions_action_type_check;

ALTER TABLE promotions 
ADD CONSTRAINT promotions_action_type_check 
CHECK (action_type IN ('quote', 'like_recast', 'comment', 'follow'));

-- 2. Update shares table action_type constraint
ALTER TABLE shares 
DROP CONSTRAINT IF EXISTS shares_action_type_check;

ALTER TABLE shares 
ADD CONSTRAINT shares_action_type_check 
CHECK (action_type IN ('quote', 'like', 'recast', 'like_recast', 'comment', 'follow'));

-- 3. Ensure comment columns exist in promotions (just in case migration 013 was only partially applied)
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS comment_templates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_comment TEXT,
ADD COLUMN IF NOT EXISTS allow_custom_comments BOOLEAN DEFAULT true;

-- 4. Update existing comments for documentation
COMMENT ON COLUMN promotions.action_type IS 'Action type: quote, like_recast, comment, or follow';
COMMENT ON COLUMN shares.action_type IS 'Action type: quote, like, recast, comment, or follow';
