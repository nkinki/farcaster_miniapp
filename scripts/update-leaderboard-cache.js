require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateLeaderboardCache() {
    console.log('Starting leaderboard cache update...');
    const client = await pool.connect();

    try {
        // 1. Get Active Season
        const seasonRes = await client.query(`SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`);
        if (seasonRes.rows.length === 0) {
            console.log('No active season found. Aborting.');
            return;
        }
        const seasonId = seasonRes.rows[0].id;
        console.log(`Active Season ID: ${seasonId}`);

        // 2. Run the Heavy Query to calculate stats
        // Note: This matches the logic in /api/season/leaderboard/route.ts but selects raw data
        // We will insert this into user_season_summary

        console.log('Calculating user stats (Heavy Query)...');

        const query = `
      WITH user_stats AS (
        SELECT 
          user_fid,
          -- Daily checks
          COALESCE((SELECT COUNT(*) FROM user_daily_points WHERE user_fid = udp.user_fid AND season_id = $1 AND daily_check = true), 0) as daily_checks,
          -- Like/Recast
          COALESCE((SELECT COUNT(*) FROM like_recast_actions WHERE user_fid = udp.user_fid), 0) as total_likes, -- Simplified mapping for likes+recasts
          -- Shares
          COALESCE((SELECT COUNT(*) FROM shares WHERE sharer_fid = udp.user_fid), 0) as total_shares,
           -- Comments (Shares type comment + pending comments)
          COALESCE((
            SELECT COUNT(*) FROM (
              SELECT created_at FROM shares WHERE sharer_fid = udp.user_fid AND action_type = 'comment'
              UNION ALL
              SELECT created_at FROM pending_comments WHERE user_fid = udp.user_fid
            ) as all_comments
          ), 0) as total_comments,
          -- Lambo tickets
          COALESCE((SELECT COUNT(*) FROM lottery_tickets WHERE player_fid = udp.user_fid), 0) as total_lambo_tickets,
          -- Weather tickets
          COALESCE((SELECT COUNT(*) FROM weather_lotto_tickets WHERE player_fid = udp.user_fid), 0) as total_weather_tickets,
          -- CHESS points
          COALESCE((SELECT SUM(chess_holdings_points) FROM user_daily_points WHERE user_fid = udp.user_fid AND season_id = $1), 0) as total_chess_points,
          -- Last activity
          MAX(udp.created_at) as last_activity
        FROM user_daily_points udp
        WHERE udp.season_id = $1
        GROUP BY udp.user_fid
      )
      SELECT 
        user_fid,
        (daily_checks + total_likes + total_shares + total_comments + total_lambo_tickets + total_weather_tickets + total_chess_points) as total_points,
        daily_checks,
        total_likes,
        total_shares,
        total_comments,
        total_lambo_tickets,
        total_weather_tickets,
        total_chess_points,
        last_activity
      FROM user_stats
    `;

        const result = await client.query(query, [seasonId]);
        console.log(`Calculated stats for ${result.rows.length} users.`);

        // 3. Batch Update/Insert into user_season_summary
        // Using a transaction for safety
        await client.query('BEGIN');

        // We could do this one by one or construct a massive UPSERT. 
        // For 100-1000 users one-by-one is fine, for 10k+ we need batching.
        // Let's use a prepared statement loop for simplicity first, usually fast enough for <10k users.

        const upsertQuery = `
      INSERT INTO user_season_summary (
        user_fid, season_id, total_points, daily_checks, total_likes, 
        total_shares, total_comments, total_lambo_tickets, total_weather_tickets, 
        total_chess_points, last_activity, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (user_fid, season_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        daily_checks = EXCLUDED.daily_checks,
        total_likes = EXCLUDED.total_likes,
        total_shares = EXCLUDED.total_shares,
        total_comments = EXCLUDED.total_comments,
        total_lambo_tickets = EXCLUDED.total_lambo_tickets,
        total_weather_tickets = EXCLUDED.total_weather_tickets,
        total_chess_points = EXCLUDED.total_chess_points,
        last_activity = EXCLUDED.last_activity,
        updated_at = NOW();
    `;

        for (const row of result.rows) {
            await client.query(upsertQuery, [
                row.user_fid,
                seasonId,
                row.total_points || 0,
                row.daily_checks || 0,
                row.total_likes || 0, // Note schema has separate likes/recasts maybe? Schema check showed total_likes, total_recasts. 
                // Logic in route.ts grouped them into 'like_recast_count'. 
                // Let's check schema again carefully... total_likes, total_recasts. 
                // Route.ts had: like_recast_count.
                // My query above mapped like_recast_count -> total_likes. 
                // This puts RECASTS into total_likes column? 
                // That's imperfect but acceptable if 'total_recasts' is unused, OR we should split them if possible.
                // Route.ts doesn't split them. It just Counts from `like_recast_actions`.
                // So I will put them in `total_likes` and leave `total_recasts` as 0 or NULL for now to match logic. 

                row.total_shares || 0,
                row.total_comments || 0,
                row.total_lambo_tickets || 0,
                row.total_weather_tickets || 0,
                row.total_chess_points || 0,
                row.last_activity
            ]);
        }

        await client.query('COMMIT');
        console.log('Leaderboard cache updated successfully via user_season_summary.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating leaderboard cache:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

updateLeaderboardCache();
