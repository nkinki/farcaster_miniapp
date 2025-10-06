-- Create follow_actions table for follow-based promotions
-- This allows users to follow specific accounts and earn rewards

CREATE TABLE IF NOT EXISTS follow_actions (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL,
    user_fid INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    action_type VARCHAR(10) NOT NULL DEFAULT 'follow',
    cast_hash VARCHAR(255) NOT NULL, -- The original cast that was followed
    proof_url TEXT, -- URL to the follow proof (optional for manual verification)
    reward_amount NUMERIC NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rewarded', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    rewarded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to promotions table
    CONSTRAINT follow_actions_promotion_id_fkey 
        FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    
    -- Prevent duplicate follow actions (same user can't follow the same promotion twice)
    CONSTRAINT unique_user_follow_per_promotion 
        UNIQUE (promotion_id, user_fid)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_follow_actions_promotion_id ON follow_actions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_follow_actions_user_fid ON follow_actions(user_fid);
CREATE INDEX IF NOT EXISTS idx_follow_actions_status ON follow_actions(status);
CREATE INDEX IF NOT EXISTS idx_follow_actions_action_type ON follow_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_follow_actions_created_at ON follow_actions(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_follow_actions_promotion_status ON follow_actions(promotion_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_actions_user_promotion ON follow_actions(user_fid, promotion_id);

-- Add follow action type to promotions table if not exists
-- This is handled by the existing action_type column, but we can add a check constraint
DO $$ 
BEGIN
    -- Add follow to the action_type check constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'promotions_action_type_check' 
        AND check_clause LIKE '%follow%'
    ) THEN
        -- Drop existing constraint and recreate with follow
        ALTER TABLE promotions DROP CONSTRAINT IF EXISTS promotions_action_type_check;
        ALTER TABLE promotions ADD CONSTRAINT promotions_action_type_check 
            CHECK (action_type IN ('quote', 'like_recast', 'comment', 'follow'));
    END IF;
END $$;
