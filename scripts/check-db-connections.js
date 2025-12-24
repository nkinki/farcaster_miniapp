const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkActiveConnections() {
    try {
        const client = await pool.connect();
        console.log('Checking active connections...');

        const query = `
            SELECT pid, usename, application_name, client_addr, state, query_start, query
            FROM pg_stat_activity
            WHERE state != 'idle' AND pid != pg_backend_pid();
        `;

        const res = await client.query(query);

        if (res.rows.length === 0) {
            console.log('No active queries/connections (other than this one).');
        } else {
            console.table(res.rows);
        }

        // Also check idle connections that might be holding sessions open
        const idleQuery = `
            SELECT count(*) as idle_connections
            FROM pg_stat_activity
            WHERE state = 'idle';
        `;
        const idleRes = await client.query(idleQuery);
        console.log(`Idle connections count: ${idleRes.rows[0].idle_connections}`);

        client.release();
    } catch (err) {
        console.error('Error checking connections:', err);
    } finally {
        await pool.end();
    }
}

checkActiveConnections();
