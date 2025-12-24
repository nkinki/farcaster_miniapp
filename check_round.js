const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkRound() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT * FROM lottery_draws WHERE status = 'active' ORDER BY id DESC LIMIT 1");

        if (res.rows.length === 0) {
            console.log("❌ No active lottery round found!");

            // Check most recent round
            const recent = await client.query("SELECT * FROM lottery_draws ORDER BY id DESC LIMIT 1");
            if (recent.rows.length > 0) {
                console.log("ℹ️ Most recent round:", recent.rows[0]);
            }
        } else {
            console.log("✅ Active round found:", res.rows[0]);
        }

        // Also check daily code
        const codeRes = await client.query("SELECT * FROM lotto_daily_codes WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1");
        if (codeRes.rows.length > 0) {
            console.log("✅ Active daily code:", codeRes.rows[0].code);
        } else {
            console.log("❌ No active daily code found!");
        }

        client.release();
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkRound();
