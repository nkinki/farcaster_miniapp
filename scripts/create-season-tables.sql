-- Season System Database Tables
-- Run this script to create all necessary tables for the season airdrop system

-- 1. Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  total_rewards BIGINT NOT NULL, -- CHESS token amount in wei
  status VARCHAR(20) DEFAULT 'active', -- active, completed, upcoming
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. User daily points table
CREATE TABLE IF NOT EXISTS user_daily_points (
  id SERIAL PRIMARY KEY,
  user_fid BIGINT NOT NULL,
  season_id INTEGER REFERENCES seasons(id),
  date DATE NOT NULL,
  daily_check BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  recasts_count INTEGER DEFAULT 0,
  quotes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  lambo_tickets INTEGER DEFAULT 0,
  weather_tickets INTEGER DEFAULT 0,
  chess_holdings_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_fid, season_id, date)
);

-- 3. Point transactions table
CREATE TABLE IF NOT EXISTS point_transactions (
  id SERIAL PRIMARY KEY,
  user_fid BIGINT NOT NULL,
  season_id INTEGER REFERENCES seasons(id),
  action_type VARCHAR(50) NOT NULL, -- daily_check, like, recast, quote, share, comment, lambo_ticket, weather_ticket, chess_holdings
  points_earned INTEGER NOT NULL,
  metadata JSONB, -- extra info (post_url, amount, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Airdrop claims table
CREATE TABLE IF NOT EXISTS airdrop_claims (
  id SERIAL PRIMARY KEY,
  user_fid BIGINT NOT NULL,
  season_id INTEGER REFERENCES seasons(id),
  points_used INTEGER NOT NULL,
  reward_amount BIGINT NOT NULL, -- CHESS wei
  status VARCHAR(20) DEFAULT 'pending', -- pending, claimed, expired
  transaction_hash VARCHAR(66),
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. User season summary table
CREATE TABLE IF NOT EXISTS user_season_summary (
  id SERIAL PRIMARY KEY,
  user_fid BIGINT NOT NULL,
  season_id INTEGER REFERENCES seasons(id),
  total_points INTEGER DEFAULT 0,
  daily_checks INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_recasts INTEGER DEFAULT 0,
  total_quotes INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_lambo_tickets INTEGER DEFAULT 0,
  total_weather_tickets INTEGER DEFAULT 0,
  total_chess_points INTEGER DEFAULT 0,
  last_activity TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_fid, season_id)
);

-- Insert Season 1
INSERT INTO seasons (name, start_date, end_date, total_rewards, status) 
VALUES (
  'Season 1 - Under Development', 
  NOW(), 
  NOW() + INTERVAL '30 days', 
  1000000, -- 1M CHESS (human readable format)
  'active'
) ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_daily_points_fid_date ON user_daily_points(user_fid, date);
CREATE INDEX IF NOT EXISTS idx_user_daily_points_season ON user_daily_points(season_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_fid ON point_transactions(user_fid);
CREATE INDEX IF NOT EXISTS idx_point_transactions_season ON point_transactions(season_id);
CREATE INDEX IF NOT EXISTS idx_airdrop_claims_fid ON airdrop_claims(user_fid);
CREATE INDEX IF NOT EXISTS idx_user_season_summary_fid ON user_season_summary(user_fid);
