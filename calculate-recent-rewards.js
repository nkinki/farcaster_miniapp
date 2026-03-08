const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const client = await pool.connect();
        const fid = 1049927;
        const cutoffDate = '2026-01-01T00:00:00Z';

        console.log(`--- RECENT REWARDS FOR FID ${fid} (SINCE ${cutoffDate}) ---`);

        // 1. Shares
        const shares = await client.query(
            "SELECT COUNT(*) as count, COALESCE(SUM(reward_amount), 0) as total FROM shares WHERE sharer_fid = $1 AND reward_claimed = FALSE AND created_at >= $2",
            [fid, cutoffDate]
        );
        console.log('Recent Unclaimed Shares:', shares.rows[0]);

        // 2. Follow Actions
        const follows = await client.query(
            "SELECT COUNT(*) as count, COALESCE(SUM(reward_amount), 0) as total FROM follow_actions WHERE user_fid = $1 AND status = 'verified' AND reward_claimed = FALSE AND created_at >= $2",
            [fid, cutoffDate]
        );
        console.log('Recent Unclaimed Follows:', follows.rows[0]);

        // 3. Airdrop Claims
        const airdrops = await client.query(
            "SELECT s.name, a.reward_amount, a.created_at, a.status FROM airdrop_claims a JOIN seasons s ON a.season_id = s.id WHERE a.user_fid = $1 AND a.created_at >= $2",
            [fid, cutoffDate]
        );
        console.log('Recent Airdrop Claims:', airdrops.rows);

        // Calculate Total Recent Pending
        const totalRecent = parseFloat(shares.rows[0].total) +
            parseFloat(follows.rows[0].total) +
            airdrops.rows.filter(a => a.status === 'pending').reduce((sum, a) => sum + parseFloat(a.reward_amount), 0);

        console.log(`\nTOTAL RECENT PENDING: ${totalRecent} $CHESS`);

        client.release();
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

run();
