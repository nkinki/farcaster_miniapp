-- Add timestamp columns to shares table for tracking share frequency
ALTER TABLE shares ADD COLUMN IF NOT EXISTS last_shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster queries on share frequency
CREATE INDEX IF NOT EXISTS idx_shares_sharer_promotion ON shares(sharer_fid, promotion_id);
CREATE INDEX IF NOT EXISTS idx_shares_last_shared ON shares(last_shared_at); 