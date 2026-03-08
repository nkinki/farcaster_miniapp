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

        console.log(`--- RESETTING PENDING REWARDS FOR FID ${fid} ---`);

        // 1. Reset Airdrop Claims
        const airdropRes = await client.query(
            "UPDATE airdrop_claims SET status = 'claimed', claimed_at = NOW() WHERE user_fid = $1 AND status = 'pending'",
            [fid]
        );
        console.log(`Airdrops reset: ${airdropRes.rowCount}`);

        // 2. Reset Shares
        const sharesRes = await client.query(
            "UPDATE shares SET reward_claimed = TRUE WHERE sharer_fid = $1 AND reward_claimed = FALSE",
            [fid]
        );
        console.log(`Shares reset: ${sharesRes.rowCount}`);

        // 3. Reset Follow Actions
        const followsRes = await client.query(
            "UPDATE follow_actions SET reward_claimed = TRUE WHERE user_fid = $1 AND reward_claimed = FALSE",
            [fid]
        );
        console.log(`Follow actions reset: ${followsRes.rowCount}`);

        client.release();
        pool.end();
    } catch (err) {
        console.error('Error during reset:', err);
    }
}

run();
