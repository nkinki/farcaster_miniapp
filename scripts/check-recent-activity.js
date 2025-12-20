const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkRecentActivity() {
    try {
        console.log('--- Recent Daily Code Usages (Last 15 mins) ---');
        const usages = await pool.query("SELECT * FROM lotto_daily_code_usages WHERE used_at > NOW() - INTERVAL '15 minutes' ORDER BY used_at DESC");
        console.table(usages.rows);

        console.log('\n--- Recent Tickets (Last 15 mins) ---');
        const tickets = await pool.query("SELECT id, player_fid, number, draw_id, purchased_at FROM lottery_tickets WHERE purchased_at > NOW() - INTERVAL '15 minutes' ORDER BY purchased_at DESC");
        console.table(tickets.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkRecentActivity();
