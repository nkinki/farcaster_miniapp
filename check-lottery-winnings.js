// Check lottery winnings for a specific FID
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkLotteryWinnings() {
    const fid = 815252; // Your FID

    try {
        const client = await pool.connect();

        // Get user's lottery winnings
        const result = await client.query(`
      SELECT 
        lw.id,
        lw.player_fid,
        lw.draw_id,
        lw.ticket_id,
        lw.amount_won,
        lw.claimed_at,
        lw.created_at,
        ld.draw_number,
        ld.winning_number,
        lt.number as ticket_number
      FROM lottery_winnings lw
      JOIN lottery_draws ld ON lw.draw_id = ld.id
      JOIN lottery_tickets lt ON lw.ticket_id = lt.id
      WHERE lw.player_fid = $1
      ORDER BY lw.created_at DESC
    `, [fid]);

        console.log(`\n🎰 Lottery Winnings for FID ${fid}:`);
        console.log(`Total winnings: ${result.rows.length}\n`);

        if (result.rows.length === 0) {
            console.log('❌ No lottery winnings found.');
        } else {
            result.rows.forEach((winning, index) => {
                console.log(`\n--- Winning #${index + 1} ---`);
                console.log(`ID: ${winning.id}`);
                console.log(`Draw #${winning.draw_number}`);
                console.log(`Winning Number: ${winning.winning_number}`);
                console.log(`Your Ticket: ${winning.ticket_number}`);
                console.log(`Amount Won: ${winning.amount_won} CHESS`);
                console.log(`Status: ${winning.claimed_at ? `✅ Claimed on ${new Date(winning.claimed_at).toLocaleString()}` : '🎁 UNCLAIMED - Ready to claim!'}`);
                console.log(`Created: ${new Date(winning.created_at).toLocaleString()}`);
            });

            const unclaimed = result.rows.filter(w => !w.claimed_at);
            if (unclaimed.length > 0) {
                console.log(`\n\n🎯 YOU HAVE ${unclaimed.length} UNCLAIMED WINNING(S)!`);
                console.log(`Total unclaimed amount: ${unclaimed.reduce((sum, w) => sum + Number(w.amount_won), 0)} CHESS`);
                console.log(`\n📍 To claim:`);
                console.log(`1. Open the "Buy a Lambo" lottery modal`);
                console.log(`2. Click on "Your Winnings" section`);
                console.log(`3. Click "Claim Prize" button`);
            }
        }

        client.release();
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkLotteryWinnings();
