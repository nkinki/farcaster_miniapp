-- Fix unique constraints for like_recast tables
-- This migration adds the missing unique constraints needed for ON CONFLICT

-- 1. Add unique constraint to like_recast_user_actions
-- This allows ON CONFLICT (promotion_id, user_fid, action_type) to work
ALTER TABLE like_recast_user_actions 
ADD CONSTRAINT like_recast_user_actions_unique_action 
UNIQUE (promotion_id, user_fid, action_type);

-- 2. Add unique constraint to like_recast_completions
-- This allows ON CONFLICT (promotion_id, user_fid) to work
ALTER TABLE like_recast_completions 
ADD CONSTRAINT like_recast_completions_unique_completion 
UNIQUE (promotion_id, user_fid);

-- 3. Add unique constraint to manual_verifications
-- This allows ON CONFLICT (action_id) to work
ALTER TABLE manual_verifications 
ADD CONSTRAINT manual_verifications_unique_action 
UNIQUE (action_id);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_like_recast_user_actions_unique_lookup 
ON like_recast_user_actions (promotion_id, user_fid, action_type);

CREATE INDEX IF NOT EXISTS idx_like_recast_completions_unique_lookup 
ON like_recast_completions (promotion_id, user_fid);

CREATE INDEX IF NOT EXISTS idx_manual_verifications_unique_lookup 
ON manual_verifications (action_id);
