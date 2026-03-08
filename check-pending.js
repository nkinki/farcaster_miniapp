const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkPending() {
    try {
        console.log('🔍 Checking pending rewards for FID 1049927...\n');

        // Check total pending rewards - status = 'active' means unclaimed
        const { rows } = await pool.query(`
            SELECT 
                SUM(total_budget) as total_pending,
                COUNT(*) as pending_count
            FROM promotions
            WHERE fid = 1049927
            AND status = 'active'
        `);

        console.log('📊 Pending Rewards Summary:');
        console.log(`  💰 Total Pending: ${rows[0].total_pending || 0} $CHESS`);
        console.log(`  📦 Number of Unclaimed Promotions: ${rows[0].pending_count || 0}\n`);

        // Show recent unclaimed promotions
        const { rows: recent } = await pool.query(`
            SELECT 
                id,
                action_type,
                total_budget,
                remaining_budget,
                reward_per_share,
                created_at,
                status
            FROM promotions
            WHERE fid = 1049927
            AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 10
        `);

        if (recent.length > 0) {
            console.log('📋 Recent Unclaimed Promotions (last 10):');
            recent.forEach(promo => {
                const date = promo.created_at.toISOString().split('T')[0];
                console.log(`  - ${promo.action_type}: ${promo.total_budget} $CHESS (${promo.reward_per_share}/share, remaining: ${promo.remaining_budget}) - ${date}`);
            });
        }

        // Also show breakdown by action type
        const { rows: breakdown } = await pool.query(`
            SELECT 
                action_type,
                SUM(total_budget) as total,
                COUNT(*) as count
            FROM promotions
            WHERE fid = 1049927
            AND status = 'active'
            GROUP BY action_type
            ORDER BY total DESC
        `);

        if (breakdown.length > 0) {
            console.log('\n📊 Breakdown by Action Type:');
            breakdown.forEach(item => {
                console.log(`  - ${item.action_type}: ${item.total} $CHESS (${item.count} promotions)`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkPending();
