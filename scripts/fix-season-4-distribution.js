/**
 * Fix Season 4 (The Grinch's Gold) Airdrop Distribution
 * 
 * This script:
 * 1. Calculates precise points for Season 4 (ID 4)
 * 2. Scales a 10,000,000 CHESS reward pool proportionally
 * 3. Inserts "pending" claims into airdrop_claims
 */

const { Pool } = require('pg');
require('dotenv').config();

const SEASON_ID = 4;
const TOTAL_REWARD_CHESS = 10000000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        console.log(`🚀 Starting fix for Season ${SEASON_ID} (The Grinch's Gold) distribution...`);

        // 1. Verify Season
        const seasonRes = await client.query('SELECT * FROM seasons WHERE id = $1', [SEASON_ID]);
        if (seasonRes.rows.length === 0) {
            throw new Error(`Season ${SEASON_ID} not found!`);
        }
        const season = seasonRes.rows[0];
        console.log(`✅ Found Season: ${season.name} (Status: ${season.status})`);

        // 2. Clear existing claims for this season (to avoid duplicates or fix zeros)
        console.log(`🧹 Clearing existing claims for Season ${SEASON_ID}...`);
        const deleteRes = await client.query('DELETE FROM airdrop_claims WHERE season_id = $1 AND status = \'pending\'', [SEASON_ID]);
        console.log(`✅ Deleted ${deleteRes.rowCount} pending claims.`);

        // 3. Calculate points exactly like in calculate-airdrop/route.ts but slightly more robustly
        console.log(`📊 Calculating points for users...`);
        const usersResult = await client.query(`
      WITH user_stats AS (
        SELECT 
          user_fid,
          -- Daily checks for specific season
          COALESCE((
            SELECT COUNT(*) FROM user_daily_points 
            WHERE user_fid = udp.user_fid AND season_id = $1 AND daily_check = true
          ), 0) as daily_checks,
          
          -- Like/Recast count (overall or might need date filter, but previous seasons used overall activity during season)
          -- For Season 4, we use actions recorded in point_transactions for safety if available, 
          -- but the standard formula used in calculate-airdrop is:
          COALESCE((
            SELECT COUNT(*) FROM like_recast_actions 
            WHERE user_fid = udp.user_fid
            -- Note: Ideally filtered by date, but matching current API logic for consistency
          ), 0) as like_recast_count,
          
          COALESCE((
            SELECT COUNT(*) FROM shares 
            WHERE sharer_fid = udp.user_fid
          ), 0) as shares_count,
          
          COALESCE((
            SELECT COUNT(*) FROM (
              SELECT created_at FROM shares WHERE sharer_fid = udp.user_fid AND action_type = 'comment'
              UNION ALL
              SELECT created_at FROM pending_comments WHERE user_fid = udp.user_fid
            ) as all_comments
          ), 0) as comments_count,
          
          COALESCE((
            SELECT COUNT(*) FROM lottery_tickets 
            WHERE player_fid = udp.user_fid
          ), 0) as lambo_tickets,
          
          COALESCE((
            SELECT COUNT(*) FROM weather_lotto_tickets 
            WHERE player_fid = udp.user_fid
          ), 0) as weather_tickets,
          
          COALESCE((
            SELECT SUM(chess_holdings_points) FROM user_daily_points 
            WHERE user_fid = udp.user_fid AND season_id = $1
          ), 0) as chess_points
          
        FROM user_daily_points udp
        WHERE udp.season_id = $1
        GROUP BY udp.user_fid
      )
      SELECT 
        user_fid,
        (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) as total_points
      FROM user_stats
      WHERE (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) > 0
      ORDER BY total_points DESC
    `, [SEASON_ID]);

        const users = usersResult.rows;
        if (users.length === 0) {
            console.log('⚠️ No users with points found for this season!');
            return;
        }

        const totalPoints = users.reduce((sum, user) => sum + parseInt(user.total_points), 0);
        console.log(`📊 Found ${users.length} users with ${totalPoints} total points.`);

        // 4. Distribute Rewards
        console.log(`💰 Distributing ${TOTAL_REWARD_CHESS} CHESS...`);
        let successCount = 0;

        for (const user of users) {
            const userPoints = parseInt(user.total_points);
            const rewardAmount = (userPoints / totalPoints) * TOTAL_REWARD_CHESS;

            if (rewardAmount > 0) {
                await client.query(`
          INSERT INTO airdrop_claims (user_fid, season_id, points_used, reward_amount, status, created_at)
          VALUES ($1, $2, $3, $4, 'pending', NOW())
          ON CONFLICT (user_fid, season_id) 
          DO UPDATE SET 
            reward_amount = $4,
            points_used = $3,
            status = 'pending'
          WHERE airdrop_claims.status != 'claimed'
        `, [user.user_fid, SEASON_ID, userPoints, rewardAmount.toFixed(2)]);
                successCount++;
            }
        }

        console.log(`✅ Successfully created/updated ${successCount} claims for Season ${SEASON_ID}.`);
        console.log(`🎉 Distribution complete!`);

    } catch (err) {
        console.error('❌ Error during distribution:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
