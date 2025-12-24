const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkSubscribers() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT app_id, COUNT(*) as count FROM notification_tokens GROUP BY app_id');
        console.log('📊 Subscriber Counts:');
        res.rows.forEach(row => {
            console.log(`- ${row.app_id}: ${row.count} subscribers`);
        });
        client.release();
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkSubscribers();
