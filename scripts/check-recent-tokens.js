const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkRecentTokens() {
    try {
        const res = await pool.query("SELECT token, fid, app_id, created_at FROM notification_tokens ORDER BY created_at DESC LIMIT 20");
        console.log('Recent 20 notification tokens:');
        res.rows.forEach(r => {
            console.log(`FID: ${r.fid}, App: ${r.app_id}, Date: ${r.created_at}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkRecentTokens();
