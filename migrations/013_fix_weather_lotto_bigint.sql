-- Migration: 013_fix_weather_lotto_bigint.sql
-- Fix bigint out of range by changing to NUMERIC type
-- MOD-042: Change BIGINT to NUMERIC for large values

-- Change weather_lotto_rounds columns to NUMERIC
ALTER TABLE weather_lotto_rounds 
ALTER COLUMN house_base TYPE NUMERIC,
ALTER COLUMN total_pool TYPE NUMERIC,
ALTER COLUMN treasury_amount TYPE NUMERIC,
ALTER COLUMN winners_pool TYPE NUMERIC;

-- Change weather_lotto_tickets columns to NUMERIC
ALTER TABLE weather_lotto_tickets 
ALTER COLUMN total_cost TYPE NUMERIC,
ALTER COLUMN payout_amount TYPE NUMERIC;

-- Change weather_lotto_claims columns to NUMERIC
ALTER TABLE weather_lotto_claims 
ALTER COLUMN total_payout TYPE NUMERIC;

-- Change weather_lotto_stats columns to NUMERIC
ALTER TABLE weather_lotto_stats 
ALTER COLUMN total_volume TYPE NUMERIC,
ALTER COLUMN total_treasury TYPE NUMERIC,
ALTER COLUMN total_payouts TYPE NUMERIC,
ALTER COLUMN current_total_pool TYPE NUMERIC;

-- Update existing data to use proper values (200k CHESS = 200000 * 10^18)
UPDATE weather_lotto_rounds 
SET 
  house_base = 200000000000000000000000,  -- 200k CHESS
  total_pool = 200000000000000000000000   -- 200k CHESS
WHERE house_base = 200000000000000000000;

-- Update stats
UPDATE weather_lotto_stats 
SET 
  current_total_pool = 200000000000000000000000  -- 200k CHESS
WHERE current_total_pool = 200000000000000000000;

-- Create new active round with proper values
INSERT INTO weather_lotto_rounds (
  round_number, 
  start_time, 
  end_time, 
  status,
  house_base,
  total_pool
) VALUES (
  COALESCE((SELECT MAX(round_number) FROM weather_lotto_rounds), 0) + 1,
  NOW(),
  NOW() + INTERVAL '1 day',
  'active',
  200000000000000000000000,  -- 200k CHESS
  200000000000000000000000   -- 200k CHESS
);

-- Update stats with new round
UPDATE weather_lotto_stats 
SET 
  active_round_id = (SELECT id FROM weather_lotto_rounds WHERE status = 'active' LIMIT 1),
  next_draw_time = (SELECT end_time FROM weather_lotto_rounds WHERE status = 'active' LIMIT 1),
  current_total_pool = 200000000000000000000000,
  current_sunny_tickets = 0,
  current_rainy_tickets = 0
WHERE id = 1;

-- Comments
COMMENT ON COLUMN weather_lotto_rounds.house_base IS 'Ház alapja: 200,000 CHESS (NUMERIC type)';
COMMENT ON COLUMN weather_lotto_rounds.total_pool IS 'Teljes pool: ház alap + játékosok befizetései (NUMERIC type)';
COMMENT ON COLUMN weather_lotto_tickets.total_cost IS 'Teljes költség: quantity * 100,000 CHESS (NUMERIC type)';
COMMENT ON COLUMN weather_lotto_tickets.payout_amount IS 'Kiszámított kifizetés (NUMERIC type)';
