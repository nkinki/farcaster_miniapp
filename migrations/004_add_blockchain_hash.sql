-- Add blockchain_hash column to promotions table
-- This column stores the transaction hash when a campaign is created on the blockchain

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS blockchain_hash VARCHAR(255);

-- Add index for blockchain_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_promotions_blockchain_hash ON promotions(blockchain_hash);

-- Add comment to explain the column
COMMENT ON COLUMN promotions.blockchain_hash IS 'Transaction hash from blockchain campaign creation'; 