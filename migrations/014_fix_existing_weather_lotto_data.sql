-- Migration: 014_fix_existing_weather_lotto_data.sql
-- Fix existing database records that still contain the old large values

-- Update existing weather_lotto_rounds to use realistic values
UPDATE weather_lotto_rounds 
SET 
  house_base = 200000,  -- 200k CHESS
  total_pool = 200000   -- 200k CHESS
WHERE house_base > 1000000; -- Only update records with the old large values

-- Update existing weather_lotto_stats to use realistic values
UPDATE weather_lotto_stats 
SET 
  current_total_pool = 200000,  -- 200k CHESS
  total_volume = 0,             -- Reset to 0
  total_treasury = 0,           -- Reset to 0
  total_payouts = 0             -- Reset to 0
WHERE current_total_pool > 1000000; -- Only update records with the old large values

-- Update existing weather_lotto_tickets to use realistic values
UPDATE weather_lotto_tickets 
SET 
  total_cost = 100,  -- 100 CHESS per ticket
  payout_amount = 0  -- Reset to 0
WHERE total_cost > 1000; -- Only update records with the old large values

-- Update existing weather_lotto_claims to use realistic values
UPDATE weather_lotto_claims 
SET 
  total_payout = 0  -- Reset to 0
WHERE total_payout > 1000; -- Only update records with the old large values

-- Create a new active round with proper values if none exists
INSERT INTO weather_lotto_rounds (
  round_number, 
  start_time, 
  end_time, 
  status,
  house_base,
  total_pool
) 
SELECT 
  COALESCE((SELECT MAX(round_number) FROM weather_lotto_rounds), 0) + 1,
  NOW(),
  NOW() + INTERVAL '1 day',
  'active',
  200000,  -- 200k CHESS
  200000   -- 200k CHESS
WHERE NOT EXISTS (
  SELECT 1 FROM weather_lotto_rounds WHERE status = 'active'
);

-- Update stats with new round
UPDATE weather_lotto_stats 
SET 
  active_round_id = (SELECT id FROM weather_lotto_rounds WHERE status = 'active' LIMIT 1),
  next_draw_time = (SELECT end_time FROM weather_lotto_rounds WHERE status = 'active' LIMIT 1),
  current_total_pool = 200000,
  current_sunny_tickets = 0,
  current_rainy_tickets = 0
WHERE id = 1;
