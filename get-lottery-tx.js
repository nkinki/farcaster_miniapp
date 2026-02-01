// Get lottery claim transaction hash
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function getLotteryClaimTx() {
    const fid = 815252;

    try {
        const client = await pool.connect();

        // First, check if lottery claims are stored separately
        // The lottery claim might use the regular claim-rewards endpoint
        // Let's check the timing - lottery was claimed at 2026-01-19 23:09:15

        const result = await client.query(`
      SELECT 
        tx_hash,
        amount,
        recipient_address,
        created_at
      FROM claims
      WHERE user_fid = $1
        AND created_at >= '2026-01-19 23:00:00'
        AND created_at <= '2026-01-19 23:15:00'
      ORDER BY created_at DESC
    `, [fid]);

        console.log('\n🎰 LOTTERY CLAIM TRANSACTION DETAILS\n');
        console.log('='.repeat(60));

        if (result.rows.length > 0) {
            const claim = result.rows[0];
            console.log(`\n✅ Found lottery claim transaction!`);
            console.log(`\nAmount: ${Number(claim.amount).toLocaleString()} CHESS`);
            console.log(`Recipient: ${claim.recipient_address}`);
            console.log(`Claimed at: ${new Date(claim.created_at).toLocaleString()}`);
            console.log(`\n📝 Transaction Hash:`);
            console.log(claim.tx_hash);
            console.log(`\n🔗 View on BaseScan:`);
            console.log(`https://basescan.org/tx/${claim.tx_hash}`);
            console.log(`\n💰 Check CHESS token balance:`);
            console.log(`https://basescan.org/token/0x23d29D30e35C5e8D321e1dc9A8a61BFD846D4C5c?a=${claim.recipient_address}`);
            console.log('\n' + '='.repeat(60));
        } else {
            console.log('\n⚠️  No claim found in that time window.');
            console.log('The lottery claim might be recorded differently.');
            console.log('Let me check all recent claims...\n');

            const allClaims = await client.query(`
        SELECT tx_hash, amount, created_at
        FROM claims
        WHERE user_fid = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [fid]);

            allClaims.rows.forEach((claim, i) => {
                console.log(`Claim ${i + 1}: ${Number(claim.amount).toLocaleString()} CHESS at ${new Date(claim.created_at).toLocaleString()}`);
                console.log(`TX: ${claim.tx_hash}\n`);
            });
        }

        client.release();
        await pool.end();

    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

getLotteryClaimTx();
