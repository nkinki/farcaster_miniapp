-- Create separate table for Like/Recast actions to keep them independent from Quote shares
-- This allows different logic, validation, and reward mechanisms

CREATE TABLE IF NOT EXISTS like_recast_actions (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL,
    user_fid INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('like', 'recast')),
    cast_hash VARCHAR(255) NOT NULL, -- The original cast that was liked/recast
    proof_url TEXT, -- URL to the like/recast proof (optional for manual verification)
    reward_amount NUMERIC NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rewarded', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    rewarded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to promotions table
    CONSTRAINT like_recast_actions_promotion_id_fkey 
        FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    
    -- Prevent duplicate actions (same user can't like/recast the same promotion twice)
    CONSTRAINT unique_user_action_per_promotion 
        UNIQUE (promotion_id, user_fid, action_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_like_recast_actions_promotion_id ON like_recast_actions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_like_recast_actions_user_fid ON like_recast_actions(user_fid);
CREATE INDEX IF NOT EXISTS idx_like_recast_actions_status ON like_recast_actions(status);
CREATE INDEX IF NOT EXISTS idx_like_recast_actions_action_type ON like_recast_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_like_recast_actions_created_at ON like_recast_actions(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_like_recast_actions_promotion_status ON like_recast_actions(promotion_id, status);
CREATE INDEX IF NOT EXISTS idx_like_recast_actions_user_status ON like_recast_actions(user_fid, status);