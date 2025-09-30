-- Reset All Season Data Script
-- This script will delete ALL season-related data for testing

-- 1. Delete all user daily points
DELETE FROM user_daily_points;

-- 2. Delete all user season summaries  
DELETE FROM user_season_summary;

-- 3. Delete all point transactions
DELETE FROM point_transactions;

-- 4. Delete all airdrop claims
DELETE FROM airdrop_claims;

-- 5. Reset Season 1 (optional - uncomment if you want to reset the season too)
-- UPDATE seasons SET 
--   start_date = NOW(),
--   end_date = NOW() + INTERVAL '30 days',
--   total_rewards = 1000000,
--   status = 'active'
-- WHERE id = 1;

-- Show remaining data counts
SELECT 'user_daily_points' as table_name, COUNT(*) as remaining_records FROM user_daily_points
UNION ALL
SELECT 'user_season_summary', COUNT(*) FROM user_season_summary  
UNION ALL
SELECT 'point_transactions', COUNT(*) FROM point_transactions
UNION ALL
SELECT 'airdrop_claims', COUNT(*) FROM airdrop_claims;
