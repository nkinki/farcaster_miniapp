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

        console.log(`\n--- Detailed Rewards for FID ${fid} ---`);

        // 1. Airdrop Claims
        const airdrops = await client.query(`
            SELECT a.*, s.name as season_name 
            FROM airdrop_claims a 
            LEFT JOIN seasons s ON a.season_id = s.id 
            WHERE a.user_fid = $1
        `, [fid]);
        console.log('\nAirdrop Claims:');
        console.table(airdrops.rows);

        // 2. Shares
        const shares = await client.query(`
            SELECT p.username as promo_owner, s.reward_amount, s.reward_claimed, s.created_at
            FROM shares s
            LEFT JOIN promotions p ON s.promotion_id = p.id
            WHERE s.sharer_fid = $1
            ORDER BY s.created_at DESC
            LIMIT 10
        `, [fid]);
        console.log('\nRecent Shares (Top 10):');
        console.table(shares.rows);

        // 3. Search for RealRobWood in promotions
        const promos = await client.query(`
            SELECT id, username, cast_url, share_text 
            FROM promotions 
            WHERE share_text ILIKE '%RealRobWood%' OR cast_url ILIKE '%RealRobWood%'
        `);
        console.log('\nPromotions mentioning "RealRobWood":');
        console.table(promos.rows);

        client.release();
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

run();
