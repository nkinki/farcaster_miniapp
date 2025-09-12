-- Add 'comment' to the allowed action types in like_recast_actions table
-- This allows comment actions to be stored in the same table

-- First, drop the existing constraint
ALTER TABLE like_recast_actions 
DROP CONSTRAINT IF EXISTS like_recast_actions_action_type_check;

-- Add the new constraint that includes 'comment'
ALTER TABLE like_recast_actions 
ADD CONSTRAINT like_recast_actions_action_type_check 
CHECK (action_type IN ('like', 'recast', 'comment'));

-- Also update the unique constraint name to be more generic
ALTER TABLE like_recast_actions 
DROP CONSTRAINT IF EXISTS unique_user_action_per_promotion;

ALTER TABLE like_recast_actions 
ADD CONSTRAINT unique_user_action_per_promotion 
UNIQUE (promotion_id, user_fid, action_type);

-- Add comment to the comment
COMMENT ON CONSTRAINT like_recast_actions_action_type_check ON like_recast_actions 
IS 'Allows like, recast, and comment action types';
