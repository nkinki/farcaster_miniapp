const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findUserInfo() {
    const targetUsername = 'jesterinvestor';
    try {
        console.log(`🔍 Searching for user: ${targetUsername}...`);

        // 1. Check users table
        const { rows: users } = await pool.query(`
      SELECT * FROM users WHERE username ILIKE $1
    `, [targetUsername]);

        if (users.length > 0) {
            const user = users[0];
            console.log('\n👤 User Found in "users" table:');
            console.log(JSON.stringify(user, null, 2));

            // Check wallets
            const { rows: wallets } = await pool.query(`
        SELECT * FROM user_wallets WHERE fid = $1
      `, [user.fid]);
            console.log(`\n💰 Wallets (${wallets.length}):`);
            console.table(wallets);

            // Check points
            const { rows: points } = await pool.query(`
        SELECT * FROM user_daily_points WHERE fid = $1 ORDER BY date DESC LIMIT 5
      `, [user.fid]);
            console.log(`\n🏆 Recent Points History (last 5 days):`);
            console.table(points);

        } else {
            console.log('\n❌ User NOT found in "users" table.');
        }

        // 2. Check promotions table (sometimes users are only here if they created a promo but didn't login)
        const { rows: promotions } = await pool.query(`
      SELECT * FROM promotions WHERE username ILIKE $1
    `, [targetUsername]);

        if (promotions.length > 0) {
            console.log(`\n📢 Promotions found (${promotions.length}):`);
            promotions.forEach(p => {
                console.log(`  - ID: ${p.id}, Status: ${p.status}, Budget: ${p.remaining_budget}/${p.total_budget}, Created: ${p.created_at}`);
            });
        } else {
            console.log('\nℹ️ No promotions found for this username.');
        }

    } catch (error) {
        console.error('❌ Error searching for user:', error);
    } finally {
        await pool.end();
    }
}

findUserInfo();
