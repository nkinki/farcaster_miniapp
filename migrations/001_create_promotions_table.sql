-- Create promotions table for Farcaster miniapp
CREATE TABLE IF NOT EXISTS promotions (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_promotions_fid ON promotions(fid);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON promotions(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_promotions_updated_at 
    BEFORE UPDATE ON promotions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create shares table to track individual shares
CREATE TABLE IF NOT EXISTS shares (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    sharer_fid INTEGER NOT NULL,
    sharer_username VARCHAR(255) NOT NULL,
    share_text TEXT,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_amount INTEGER NOT NULL
);

-- Create indexes for shares table
CREATE INDEX IF NOT EXISTS idx_shares_promotion_id ON shares(promotion_id);
CREATE INDEX IF NOT EXISTS idx_shares_sharer_fid ON shares(sharer_fid);
CREATE INDEX IF NOT EXISTS idx_shares_shared_at ON shares(shared_at);

-- Create users table to track user stats
CREATE TABLE IF NOT EXISTS users (
    fid INTEGER PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    total_earnings INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 