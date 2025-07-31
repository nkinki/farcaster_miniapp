-- Fix tables if they don't exist or are missing columns
-- This migration ensures all required tables and columns exist

-- Check and create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    fid INTEGER PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    total_earnings INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add username column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) NOT NULL DEFAULT 'unknown';

-- Add display_name column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Add total_earnings column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earnings INTEGER DEFAULT 0;

-- Add total_shares column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_shares INTEGER DEFAULT 0;

-- Check and create promotions table if it doesn't exist
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

-- Check and create shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS shares (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER NOT NULL,
    sharer_fid INTEGER NOT NULL,
    sharer_username VARCHAR(255) NOT NULL,
    share_text TEXT,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_amount INTEGER NOT NULL
);

-- Add foreign key constraint if it doesn't exist (simplified)
-- Note: This constraint might already exist, so we'll skip it for now
-- ALTER TABLE shares DROP CONSTRAINT IF EXISTS shares_promotion_id_fkey;
-- ALTER TABLE shares ADD CONSTRAINT shares_promotion_id_fkey 
--     FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_promotions_fid ON promotions(fid);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON promotions(created_at);
CREATE INDEX IF NOT EXISTS idx_shares_promotion_id ON shares(promotion_id);
CREATE INDEX IF NOT EXISTS idx_shares_sharer_fid ON shares(sharer_fid);
CREATE INDEX IF NOT EXISTS idx_shares_shared_at ON shares(shared_at);

-- Create or replace the update function (commented out to avoid syntax issues)
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
-- Note: These triggers might already exist, so we'll skip them for now
-- DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
-- CREATE TRIGGER update_promotions_updated_at 
--     BEFORE UPDATE ON promotions 
--     FOR EACH ROW 
--     EXECUTE FUNCTION update_updated_at_column();

-- DROP TRIGGER IF EXISTS update_users_updated_at ON users;
-- CREATE TRIGGER update_users_updated_at 
--     BEFORE UPDATE ON users 
--     FOR EACH ROW 
--     EXECUTE FUNCTION update_updated_at_column(); 