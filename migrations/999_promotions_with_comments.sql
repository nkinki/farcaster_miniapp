-- Create promotions_with_comments table for enhanced promotion system
-- This table is completely separate from the existing promotions table
-- to ensure no impact on the current working system

CREATE TABLE IF NOT EXISTS promotions_with_comments (
    id SERIAL PRIMARY KEY,
    fid INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    cast_url TEXT NOT NULL,
    share_text TEXT,
    reward_per_share INTEGER NOT NULL DEFAULT 1000,
    total_budget INTEGER NOT NULL DEFAULT 10000,
    shares_count INTEGER NOT NULL DEFAULT 0,
    remaining_budget INTEGER NOT NULL DEFAULT 10000,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    blockchain_hash VARCHAR(255) UNIQUE,
    action_type VARCHAR(50) DEFAULT 'quote' CHECK (action_type IN ('quote', 'like_recast')),
    
    -- New comment functionality fields
    comment_templates JSONB DEFAULT '[]'::jsonb, -- Array of selected comment templates
    custom_comment TEXT, -- Custom comment text (max 280 chars)
    allow_custom_comments BOOLEAN DEFAULT true, -- Allow users to add custom comments
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_promotions_with_comments_fid ON promotions_with_comments(fid);
CREATE INDEX IF NOT EXISTS idx_promotions_with_comments_status ON promotions_with_comments(status);
CREATE INDEX IF NOT EXISTS idx_promotions_with_comments_created_at ON promotions_with_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_promotions_with_comments_blockchain_hash ON promotions_with_comments(blockchain_hash);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_promotions_with_comments_updated_at 
    BEFORE UPDATE ON promotions_with_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create shares_with_comments table to track individual shares with comment data
CREATE TABLE IF NOT EXISTS shares_with_comments (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL REFERENCES promotions_with_comments(id) ON DELETE CASCADE,
    sharer_fid INTEGER NOT NULL,
    sharer_username VARCHAR(255) NOT NULL,
    share_text TEXT,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_amount INTEGER NOT NULL,
    
    -- New comment fields
    comment_text TEXT, -- The actual comment text used
    comment_template_used VARCHAR(255), -- Which template was used (if any)
    is_custom_comment BOOLEAN DEFAULT false, -- Whether it's a custom comment
    comment_length INTEGER DEFAULT 0 -- Length of the comment for analytics
);

-- Create indexes for shares_with_comments table
CREATE INDEX IF NOT EXISTS idx_shares_with_comments_promotion_id ON shares_with_comments(promotion_id);
CREATE INDEX IF NOT EXISTS idx_shares_with_comments_sharer_fid ON shares_with_comments(sharer_fid);
CREATE INDEX IF NOT EXISTS idx_shares_with_comments_shared_at ON shares_with_comments(shared_at);
CREATE INDEX IF NOT EXISTS idx_shares_with_comments_comment_template ON shares_with_comments(comment_template_used);

-- Create users_with_comments table to track user stats with comment analytics
CREATE TABLE IF NOT EXISTS users_with_comments (
    fid INTEGER PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    total_earnings INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    
    -- New comment analytics
    total_comments_made INTEGER DEFAULT 0,
    total_templates_used INTEGER DEFAULT 0,
    total_custom_comments INTEGER DEFAULT 0,
    average_comment_length DECIMAL(5,2) DEFAULT 0,
    most_used_template VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for users_with_comments table
CREATE TRIGGER update_users_with_comments_updated_at 
    BEFORE UPDATE ON users_with_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraints for data integrity
ALTER TABLE promotions_with_comments 
ADD CONSTRAINT check_comment_templates_array 
CHECK (jsonb_typeof(comment_templates) = 'array');

ALTER TABLE promotions_with_comments 
ADD CONSTRAINT check_custom_comment_length 
CHECK (custom_comment IS NULL OR length(custom_comment) <= 280);

ALTER TABLE shares_with_comments 
ADD CONSTRAINT check_comment_length 
CHECK (comment_text IS NULL OR length(comment_text) <= 280);

-- Add comments to tables for documentation
COMMENT ON TABLE promotions_with_comments IS 'Enhanced promotions table with comment functionality';
COMMENT ON TABLE shares_with_comments IS 'Enhanced shares table with comment tracking';
COMMENT ON TABLE users_with_comments IS 'Enhanced users table with comment analytics';

COMMENT ON COLUMN promotions_with_comments.comment_templates IS 'JSON array of selected comment templates (max 3)';
COMMENT ON COLUMN promotions_with_comments.custom_comment IS 'Custom comment text (max 280 characters)';
COMMENT ON COLUMN promotions_with_comments.allow_custom_comments IS 'Whether users can add custom comments';

COMMENT ON COLUMN shares_with_comments.comment_text IS 'The actual comment text used in the share';
COMMENT ON COLUMN shares_with_comments.comment_template_used IS 'Which template was used (if any)';
COMMENT ON COLUMN shares_with_comments.is_custom_comment IS 'Whether the comment was custom or from template';
COMMENT ON COLUMN shares_with_comments.comment_length IS 'Length of the comment for analytics';
