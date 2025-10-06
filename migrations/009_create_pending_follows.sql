-- Create pending_follows table for follow-based promotions (similar to pending_comments)
-- This allows manual follow verification and admin approval

CREATE TABLE IF NOT EXISTS pending_follows (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL,
    user_fid INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    target_username VARCHAR(255) NOT NULL, -- The username to follow
    target_user_fid INTEGER, -- Optional: resolved FID
    reward_amount NUMERIC NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by INTEGER, -- Admin FID who reviewed
    review_notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to promotions table
    CONSTRAINT pending_follows_promotion_id_fkey 
        FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    
    -- Prevent duplicate pending follows
    CONSTRAINT unique_user_pending_follow_per_promotion 
        UNIQUE (promotion_id, user_fid)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_follows_promotion_id ON pending_follows(promotion_id);
CREATE INDEX IF NOT EXISTS idx_pending_follows_user_fid ON pending_follows(user_fid);
CREATE INDEX IF NOT EXISTS idx_pending_follows_status ON pending_follows(status);
CREATE INDEX IF NOT EXISTS idx_pending_follows_created_at ON pending_follows(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pending_follows_promotion_status ON pending_follows(promotion_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_follows_user_promotion ON pending_follows(user_fid, promotion_id);
