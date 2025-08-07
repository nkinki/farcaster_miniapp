-- Add payouts table to track claimed rewards
-- This allows us to keep share history while tracking what's been paid out

CREATE TABLE IF NOT EXISTS payouts (
    id SERIAL PRIMARY KEY,
    user_fid INTEGER NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    shares_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payouts_user_fid ON payouts(user_fid);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_hash ON payouts(tx_hash);

-- Add claimed_at column to shares table to track when rewards were claimed
ALTER TABLE shares ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- Create index for claimed shares
CREATE INDEX IF NOT EXISTS idx_shares_claimed_at ON shares(claimed_at);
CREATE INDEX IF NOT EXISTS idx_shares_reward_claimed ON shares(reward_claimed);