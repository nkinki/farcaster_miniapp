-- Add action_type column to promotions table to distinguish between quote and like/recast campaigns
-- This allows us to handle different promotion types independently

-- Add action_type column to promotions table
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS action_type VARCHAR(20) NOT NULL DEFAULT 'quote' 
CHECK (action_type IN ('quote', 'like_recast'));

-- Update existing promotions to be 'quote' type (they are all quote-based currently)
UPDATE promotions SET action_type = 'quote' WHERE action_type IS NULL OR action_type = 'quote';

-- Add action_type column to shares table to track what type of action was performed
ALTER TABLE shares ADD COLUMN IF NOT EXISTS action_type VARCHAR(20) NOT NULL DEFAULT 'quote'
CHECK (action_type IN ('quote', 'like', 'recast'));

-- Update existing shares to be 'quote' type
UPDATE shares SET action_type = 'quote' WHERE action_type IS NULL OR action_type = 'quote';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotions_action_type ON promotions(action_type);
CREATE INDEX IF NOT EXISTS idx_shares_action_type ON shares(action_type);

-- Add composite index for promotion queries by action type and status
CREATE INDEX IF NOT EXISTS idx_promotions_action_status ON promotions(action_type, status);