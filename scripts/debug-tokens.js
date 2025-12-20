const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function debugTokens() {
    try {
        // Check recent tokens
        const res = await pool.query("SELECT * FROM notification_tokens ORDER BY created_at DESC LIMIT 10");
        console.log('Recent notification tokens:');
        console.table(res.rows);

        // Check count by app_id
        const stats = await pool.query("SELECT app_id, COUNT(*) FROM notification_tokens GROUP BY app_id");
        console.log('\nStats by app_id:');
        console.table(stats.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugTokens();
