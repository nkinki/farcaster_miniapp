-- Create pending_comments table for admin approval system
CREATE TABLE IF NOT EXISTS pending_comments (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_fid INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    comment_text TEXT NOT NULL,
    cast_hash VARCHAR(255) NOT NULL,
    reward_amount INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INTEGER NULL, -- Admin FID who reviewed
    review_notes TEXT NULL,
    
    -- Indexes for performance
    INDEX idx_pending_comments_promotion_id (promotion_id),
    INDEX idx_pending_comments_status (status),
    INDEX idx_pending_comments_created_at (created_at),
    INDEX idx_pending_comments_user_fid (user_fid)
);

-- Add comment to table
COMMENT ON TABLE pending_comments IS 'Comments waiting for admin approval before reward is credited';
COMMENT ON COLUMN pending_comments.status IS 'pending, approved, or rejected';
COMMENT ON COLUMN pending_comments.reviewed_by IS 'FID of admin who reviewed the comment';
COMMENT ON COLUMN pending_comments.review_notes IS 'Admin notes about the review decision';
