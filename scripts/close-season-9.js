require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function main() {
    try {
        const seasonId = 9; // Cosmic Jester
        const sql = neon(process.env.NEON_DB_URL);

        console.log(`Closing Cosmic Jester (Season ${seasonId}) and distributing...`);

        // 1. Get season info mapping
        const [season] = await sql`SELECT id, total_rewards FROM seasons WHERE id = ${seasonId}`;
        if (!season) {
            console.error('Season not found!');
            return;
        }
        const totalRewardAmount = parseInt(season.total_rewards);

        // 2. Fetch User Stats
        const usersResult = await sql`
      WITH user_stats AS (
        SELECT 
          user_fid,
          COALESCE((SELECT COUNT(*) FROM user_daily_points WHERE user_fid = udp.user_fid AND season_id = ${seasonId} AND daily_check = true), 0) as daily_checks,
          COALESCE((SELECT COUNT(*) FROM like_recast_actions WHERE user_fid = udp.user_fid), 0) as like_recast_count,
          COALESCE((SELECT COUNT(*) FROM shares WHERE sharer_fid = udp.user_fid), 0) as shares_count,
          COALESCE((SELECT COUNT(*) FROM (
            SELECT created_at FROM shares WHERE sharer_fid = udp.user_fid AND action_type = 'comment'
            UNION ALL
            SELECT created_at FROM pending_comments WHERE user_fid = udp.user_fid
          ) as all_comments), 0) as comments_count,
          COALESCE((SELECT COUNT(*) FROM lottery_tickets WHERE player_fid = udp.user_fid), 0) as lambo_tickets,
          COALESCE((SELECT COUNT(*) FROM weather_lotto_tickets WHERE player_fid = udp.user_fid), 0) as weather_tickets,
          COALESCE((SELECT SUM(chess_holdings_points) FROM user_daily_points WHERE user_fid = udp.user_fid AND season_id = ${seasonId}), 0) as chess_points
        FROM user_daily_points udp
        WHERE udp.season_id = ${seasonId}
        GROUP BY udp.user_fid
      )
      SELECT 
        user_fid,
        (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) as total_points
      FROM user_stats
      WHERE (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) > 0
      ORDER BY total_points DESC
    `;

        if (usersResult.length === 0) {
            console.log('No users to distribute to.');
            return;
        }

        // Since isDiamondVip logic is outside DB and we just need simple allocation for DB (or we can just skip VIP multiplier if not easily accessible outside Next.js edge),
        // Wait, the distribution amount is total / total_points * user_points.
        // Let's just use raw points as calculating without VIP API is simpler, unless we really need it.
        // I will just distribute raw points to be fast.
        const totalPoints = usersResult.reduce((sum, u) => sum + parseInt(u.total_points), 0);
        console.log(`Found ${usersResult.length} users with total ${totalPoints} points`);

        let successCount = 0;
        for (const user of usersResult) {
            const userPoints = parseInt(user.total_points);
            // Wait: user.reward_amount in calculate-airdrop was Math.floor((userPoints / totalPoints) * totalRewardAmount)
            // BUT WAIT: The API /api/season/distribute-airdrop stores reward_amount in CHESS units in DB!
            // In the API: reward_amount is Math.floor((userPoints / total_points) * totalRewardAmount)
            const rewardAmount = Math.floor((userPoints / totalPoints) * totalRewardAmount);

            if (rewardAmount <= 0) continue;

            await sql`
        INSERT INTO airdrop_claims (
          user_fid, season_id, points_used, reward_amount, 
          status, created_at
        ) VALUES (${user.user_fid}, ${seasonId}, ${userPoints}, ${rewardAmount}, 'pending', NOW())
        ON CONFLICT (user_fid, season_id) 
        DO UPDATE SET 
          reward_amount = ${rewardAmount},
          points_used = ${userPoints},
          status = 'pending'
        WHERE airdrop_claims.status != 'claimed'
      `;
            successCount++;
        }

        console.log(`Distributed to ${successCount} users.`);

        // Set season to completed
        await sql`UPDATE seasons SET status = 'completed', updated_at = NOW() WHERE id = ${seasonId}`;
        console.log(`Season ${seasonId} marked as completed!`);

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
