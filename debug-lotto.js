// Try to load .env.local first, but fall back to .env if DATABASE_URL is missing
require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
    require('dotenv').config({ path: '.env', override: true });
}

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkLotto() {
    const client = await pool.connect();
    try {
        console.log('--- Recent Lottery Draws ---');
        const res = await client.query('SELECT id, draw_number, status, start_time, end_time, winning_number, jackpot FROM lottery_draws ORDER BY draw_number DESC LIMIT 5');
        console.table(res.rows);

        console.log('\n--- Current Active Rounds ---');
        const active = await client.query("SELECT * FROM lottery_draws WHERE status = 'active'");
        console.table(active.rows);

        console.log('\n--- Server Time ---');
        const time = await client.query('SELECT NOW() as now');
        console.log('DB Now:', time.rows[0].now);
        console.log('Process Now:', new Date().toISOString());

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkLotto();
