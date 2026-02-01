// Reset lottery claim directly in database (alternative to API)
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function resetClaimDB() {
    const winningId = 19;
    const playerFid = 815252;

    try {
        const client = await pool.connect();

        console.log('\n🔄 Resetting lottery claim in database...\n');

        // Get current status
        const checkResult = await client.query(`
      SELECT id, amount_won, claimed_at, transaction_hash
      FROM lottery_winnings
      WHERE id = $1 AND player_fid = $2
    `, [winningId, playerFid]);

        if (checkResult.rows.length === 0) {
            console.log('❌ Winning not found');
            client.release();
            await pool.end();
            return;
        }

        const winning = checkResult.rows[0];
        console.log('📊 Current Status:');
        console.log(`   - Amount: ${winning.amount_won} CHESS`);
        console.log(`   - Claimed At: ${winning.claimed_at || 'Not claimed'}`);
        console.log(`   - Transaction Hash: ${winning.transaction_hash || 'NULL (PROBLEM!)'}`);

        if (!winning.claimed_at) {
            console.log('\n✅ Already unclaimed - you can claim it now!');
            client.release();
            await pool.end();
            return;
        }

        // Reset the claim
        await client.query(`
      UPDATE lottery_winnings 
      SET claimed_at = NULL, transaction_hash = NULL
      WHERE id = $1
    `, [winningId]);

        // Add back to treasury
        await client.query(`
      UPDATE lottery_stats 
      SET total_jackpot = total_jackpot + $1
      WHERE id = 1
    `, [winning.amount_won]);

        console.log('\n✅ SUCCESS! Claim has been reset.\n');
        console.log('🎯 Next Steps:');
        console.log('   1. Open the app at farc-nu.vercel.app');
        console.log('   2. Click "Buy a Lambo" lottery');
        console.log('   3. Click "Your Winnings" section');
        console.log('   4. Click "Claim Prize" button');
        console.log('   5. Wait for the on-chain transaction to complete');
        console.log('   6. Verify the CHESS tokens in your wallet\n');

        client.release();
        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

resetClaimDB();
