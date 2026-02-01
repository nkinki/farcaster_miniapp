const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUser() {
    await client.connect();
    try {
        const fid = 439015;
        console.log(`Checking status for FID: ${fid}`);

        // Check wallet
        const walletRes = await client.query('SELECT wallet_address FROM user_wallets WHERE fid = $1', [fid]);
        console.log('Wallet:', walletRes.rows);

        // Check VIP status (on-chain check usually, but let's see if there's any local flag)
        // Actually isDiamondVip in code does on-chain check.

        // Check usage today
        const usageRes = await client.query(`
            SELECT * FROM daily_code_usages
            WHERE fid = $1 
            AND used_at > CURRENT_DATE
        `, [fid]);
        console.log('Usage today:', usageRes.rows);

        // Check codes available
        const codesRes = await client.query('SELECT code, is_active FROM daily_codes WHERE is_active = TRUE');
        console.log('Active codes:', codesRes.cols ? codesRes.rows : 'Table might not have many entries');

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkUser();
