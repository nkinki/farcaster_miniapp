const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function analyzeStorage() {
    try {
        const client = await pool.connect();
        console.log('Connected to database. Analyzing storage usage...');

        const query = `
            SELECT
                schemaname || '.' || relname AS table_name,
                pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
                pg_size_pretty(pg_relation_size(relid)) AS data_size,
                pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_toast_size,
                n_live_tup AS row_estimate
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(relid) DESC
            LIMIT 20;
        `;

        const res = await client.query(query);

        console.log('TABLE_STATS_START');
        console.log(JSON.stringify(res.rows, null, 2));
        console.log('TABLE_STATS_END');

        client.release();
    } catch (err) {
        console.error('Error analyzing storage:', err);
    } finally {
        await pool.end();
    }
}

analyzeStorage();
