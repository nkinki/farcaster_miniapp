const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkRedemptionStatus() {
    try {
        // 1. Get active code
        const activeCodeRes = await pool.query("SELECT code FROM lotto_daily_codes WHERE is_active = TRUE LIMIT 1");
        const activeCode = activeCodeRes.rows[0]?.code;
        console.log('Active Code:', activeCode);

        if (activeCode) {
            // 2. Count usages
            const usageRes = await pool.query("SELECT fid, used_at FROM lotto_daily_code_usages WHERE code = $1", [activeCode]);
            console.log(`Usages for ${activeCode}:`, usageRes.rows.length);
            console.table(usageRes.rows);
        }

        // 3. Count total tickets in active round
        const roundRes = await pool.query("SELECT id FROM lottery_draws WHERE status = 'active' ORDER BY draw_number DESC LIMIT 1");
        if (roundRes.rows.length > 0) {
            const roundId = roundRes.rows[0].id;
            const ticketRes = await pool.query("SELECT COUNT(*) FROM lottery_tickets WHERE draw_id = $1", [roundId]);
            console.log(`Total tickets in active round (${roundId}):`, ticketRes.rows[0].count);

            const priceRes = await pool.query("SELECT player_fid, COUNT(*) FROM lottery_tickets WHERE draw_id = $1 GROUP BY player_fid", [roundId]);
            console.log('Tickets per FID:');
            console.table(priceRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkRedemptionStatus();
