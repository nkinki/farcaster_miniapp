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

        console.log(`--- RAW DATABASE DUMP FOR FID ${fid} ---`);

        const airdrops = await client.query("SELECT * FROM airdrop_claims WHERE user_fid = $1", [fid]);
        console.log('Airdrop Claims:', JSON.stringify(airdrops.rows, null, 2));

        const recent_shares = await client.query("SELECT * FROM shares WHERE sharer_fid = $1 ORDER BY created_at DESC LIMIT 5", [fid]);
        console.log('Recent Shares:', JSON.stringify(recent_shares.rows, null, 2));

        const follow_actions = await client.query("SELECT * FROM follow_actions WHERE user_fid = $1", [fid]);
        console.log('Follow Actions:', JSON.stringify(follow_actions.rows, null, 2));

        const promoSearch = await client.query("SELECT * FROM promotions WHERE share_text ILIKE '%RealRobWood%' OR cast_url ILIKE '%RealRobWood%' OR username = 'cartoonmeseries'");
        console.log('Promotions Search:', JSON.stringify(promoSearch.rows, null, 2));

        client.release();
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

run();
