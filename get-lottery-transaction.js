// Get lottery transaction hash from lottery_winnings table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function getLotteryTransaction() {
    const fid = 815252;

    try {
        const client = await pool.connect();

        const result = await client.query(`
      SELECT 
        lw.id,
        lw.amount_won,
        lw.claimed_at,
        lw.transaction_hash,
        ld.draw_number,
        ld.winning_number,
        lt.number as ticket_number,
        lt.player_address
      FROM lottery_winnings lw
      JOIN lottery_draws ld ON lw.draw_id = ld.id
      JOIN lottery_tickets lt ON lw.ticket_id = lt.id
      WHERE lw.player_fid = $1
      ORDER BY lw.created_at DESC
      LIMIT 1
    `, [fid]);

        if (result.rows.length === 0) {
            console.log('No lottery winnings found.');
            client.release();
            await pool.end();
            return;
        }

        const winning = result.rows[0];

        console.log('\n' + '='.repeat(70));
        console.log('🎰 LOTTERY WINNING DETAILS');
        console.log('='.repeat(70));
        console.log(`\n🏆 Draw #${winning.draw_number}`);
        console.log(`🎯 Winning Number: ${winning.winning_number}`);
        console.log(`🎫 Your Ticket: ${winning.ticket_number}`);
        console.log(`💰 Amount Won: ${Number(winning.amount_won).toLocaleString()} CHESS`);
        console.log(`📅 Claimed: ${winning.claimed_at ? new Date(winning.claimed_at).toLocaleString() : 'NOT CLAIMED'}`);
        console.log(`\n👛 Recipient Wallet:`);
        console.log(winning.player_address);

        if (winning.transaction_hash) {
            console.log(`\n📝 Transaction Hash:`);
            console.log(winning.transaction_hash);
            console.log(`\n🔗 View on BaseScan:`);
            console.log(`https://basescan.org/tx/${winning.transaction_hash}`);
        } else {
            console.log(`\n⚠️  No transaction hash found - claim may have failed or not been processed on-chain.`);
        }

        console.log(`\n💵 Check your CHESS token balance:`);
        console.log(`https://basescan.org/token/0x23d29D30e35C5e8D321e1dc9A8a61BFD846D4C5c?a=${winning.player_address}`);
        console.log('\n' + '='.repeat(70) + '\n');

        client.release();
        await pool.end();

    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

getLotteryTransaction();
