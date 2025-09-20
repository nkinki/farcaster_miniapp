-- Fix bigint out of range error by using smaller test values
-- Instead of 200000000000000000000000 (200k CHESS), use 200000000000000000000 (200 CHESS)

-- Update existing rounds to use smaller values
UPDATE weather_lotto_rounds 
SET 
  house_base = 200000000000000000000,  -- 200 CHESS instead of 200k
  total_pool = 200000000000000000000   -- 200 CHESS instead of 200k
WHERE house_base = 200000000000000000000000;

-- Update stats to use smaller values
UPDATE weather_lotto_stats 
SET 
  current_total_pool = 200000000000000000000  -- 200 CHESS instead of 200k
WHERE current_total_pool = 200000000000000000000000;

-- Create a new active round with smaller values
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
  200000000000000000000,  -- 200 CHESS (18 decimals)
  200000000000000000000   -- 200 CHESS (18 decimals)
);

-- Update stats with new round
UPDATE weather_lotto_stats 
SET 
  active_round_id = (SELECT id FROM weather_lotto_rounds WHERE status = 'active' LIMIT 1),
  next_draw_time = (SELECT end_time FROM weather_lotto_rounds WHERE status = 'active' LIMIT 1),
  current_total_pool = 200000000000000000000,
  current_sunny_tickets = 0,
  current_rainy_tickets = 0
WHERE id = 1;

-- Check the results
SELECT id, round_number, status, house_base, total_pool FROM weather_lotto_rounds WHERE status = 'active';
SELECT * FROM weather_lotto_stats WHERE id = 1;
