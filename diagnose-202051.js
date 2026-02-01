const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function diagnose() {
    try {
        console.log('--- DIAGNOSING FID 202051 (Jan 14) ---');

        // 1. Check daily_code_usages
        const usages = await pool.query("SELECT * FROM daily_code_usages WHERE fid = 202051 AND used_at::date = '2026-01-14'");
        console.log('Daily Code Usages:', usages.rows);

        // 2. Check lottery_tickets
        const tickets = await pool.query("SELECT * FROM lottery_tickets WHERE player_fid = 202051 AND created_at::date = '2026-01-14'");
        console.log('Lottery Tickets:', tickets.rows);

        // 3. Check promotions - searching by FID and approximate time
        // Note: promotions table might use 'fid' as text or bigint
        const promos = await pool.query("SELECT id, fid, action_type, created_at, blockchain_hash FROM promotions WHERE (fid = '202051' OR fid = '202051') AND created_at >= '2026-01-14 00:00:00' AND created_at < '2026-01-15 00:00:00'");
        console.log('Promotions found for FID 202051 today:', promos.rows.length);
        promos.rows.forEach(p => console.log(`- ID: ${p.id}, Action: ${p.action_type}, Created: ${p.created_at}, Hash: ${p.blockchain_hash}`));

        // 4. Check for ANY promotions created at 01:01:47 today
        const zeitgeist = await pool.query("SELECT id, fid, action_type, created_at FROM promotions WHERE created_at BETWEEN '2026-01-14 01:01:40' AND '2026-01-14 01:01:55'");
        console.log('Any promotions created around 01:01:47 UTC:', zeitgeist.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

diagnose();
