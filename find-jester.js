const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findJester() {
    try {
        console.log('--- SEARCHING FOR jesterinvestor ---');

        // Check users
        const { rows: users } = await pool.query("SELECT * FROM users WHERE username = 'jesterinvestor'");
        if (users.length > 0) {
            const u = users[0];
            console.log(`USER FOUND: FID=${u.fid}, Name=${u.display_name}, Points=${u.points || 0}`);

            // Check wallet
            const { rows: wallets } = await pool.query("SELECT * FROM user_wallets WHERE fid = $1", [u.fid]);
            if (wallets.length > 0) {
                console.log(`WALLET: ${wallets[0].wallet_address} (Label: ${wallets[0].label})`);
            } else {
                console.log('WALLET: None found');
            }
        } else {
            console.log('USER: Not found in users table');
        }

        // Check promotions
        const { rows: promos } = await pool.query("SELECT * FROM promotions WHERE username = 'jesterinvestor'");
        if (promos.length > 0) {
            console.log(`PROMOTIONS (${promos.length}):`);
            promos.forEach(p => {
                console.log(`- ID ${p.id}: ${p.status.toUpperCase()} | Budget: ${p.remaining_budget}/${p.total_budget} | Created: ${p.created_at}`);
            });
        } else {
            console.log('PROMOTIONS: None found');
        }

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await pool.end();
    }
}

findJester();
