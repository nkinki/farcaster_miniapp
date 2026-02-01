const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function recover() {
    const fid = 202051;
    const username = 'r0za';
    const castUrl = 'https://warpcast.com/r0za/0xb0824b08'; // Example or last used

    // We saw they have a lottery ticket at 2026-01-14T01:01:47.508Z
    // And a daily_code_usage at 2026-01-14T01:01:47.534Z
    // But no promotions.

    try {
        console.log(`🚀 Recovering promotions for FID ${fid}...`);

        const REWARD_PER_SHARE = 10000; // VIP default
        const VIP_BUDGET = 100000;
        const blockchainHash = `recovery_promo_1768352507507_${fid}`;
        const actionTypes = ['like_recast', 'quote', 'comment'];

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const actionType of actionTypes) {
                const res = await client.query(`
                    INSERT INTO promotions (
                        fid, username, display_name, cast_url, share_text,
                        reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type, owner_fid
                    ) VALUES (
                        $1, $2, $3, $4, NULL, 
                        $5, $6, $7, 'active', $8, $9, $10
                    ) RETURNING id
                `, [fid, username, username, castUrl, REWARD_PER_SHARE, VIP_BUDGET, VIP_BUDGET, blockchainHash + '_' + actionType, actionType, fid]);

                console.log(`✅ Promotion ${actionType} created with ID: ${res.rows[0].id}`);
            }

            await client.query('COMMIT');
            console.log('🎉 Recovery successful!');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Recovery failed:', error);
    } finally {
        await pool.end();
    }
}

recover();
