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

        console.log(`--- RECENT CLAIMS FOR FID ${fid} ---`);
        const res = await client.query(
            "SELECT * FROM claims WHERE user_fid = $1 AND created_at > '2026-01-01' ORDER BY created_at DESC",
            [fid]
        );
        console.log(JSON.stringify(res.rows, null, 2));

        client.release();
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

run();
