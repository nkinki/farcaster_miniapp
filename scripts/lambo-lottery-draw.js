const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function performLotteryDraw() {
  const client = await pool.connect();
  console.log('🏁 --- Starting New Draw (RANDOM MODE) --- 🏁');
  
  try {
    console.log('[1/10] Connecting to database and starting transaction...');
    await client.query('BEGIN');
    console.log('✅ Transaction started.');
    
    const forceNow = process.env.FORCE_DRAW_NOW === 'true' || process.argv.includes('--force-now');
    if (forceNow) {
      console.log('⏱️ FORCE NOW enabled – setting end_time to NOW() for active rounds...');
      await client.query(`UPDATE lottery_draws SET end_time = NOW() WHERE status = 'active';`);
    }

    console.log('[2/10] Searching for an active round that is due for drawing...');
    let roundResult = await client.query(`
      SELECT * FROM lottery_draws 
      WHERE status = 'active' AND end_time <= NOW()
      ORDER BY draw_number DESC 
      LIMIT 1
    `);
    
    if (roundResult.rows.length === 0) {
      console.log('ℹ️ No rounds ready for drawing.');
      if (roundResult.rows.length === 0) {
        console.log('🛑 No rounds to draw. Rolling back and exiting.');
        await client.query('ROLLBACK');
        return;
      }
    }
    
    const round = roundResult.rows[0];
    console.log(`✅ Found round to draw: ID #${round.id}, Draw Number #${round.draw_number}`);
    
    console.log(`[3/10] Fetching all tickets for round ID #${round.id}...`);
    const ticketsResult = await client.query(`SELECT * FROM lottery_tickets WHERE draw_id = $1`, [round.id]);
    const totalTicketsSold = ticketsResult.rows.length;
    console.log(`✅ Found ${totalTicketsSold} tickets.`);

    // --- VÉLETLENSZERŰ SORSOLÁS ---
    console.log('[4/10] Generating random winning number...');
    const winningNumber = 19; // Véletlenszerű szám 1-100 között
    console.log(`🎲 Random winning number is: ${winningNumber}`);

    console.log('[5/10] Searching for winners...');
    const winners = ticketsResult.rows.filter(ticket => parseInt(ticket.number, 10) === winningNumber);

    let nextPrizePool;
    const ticketSales = totalTicketsSold * 100000;
    const currentJackpot = parseInt(round.jackpot, 10);

    if (winners.length > 0) {
      console.log(`✅🏆 Winner(s) found! Total winners: ${winners.length}`);
      
      const prizeShare = Math.floor(currentJackpot / winners.length);
      console.log(`💰 Prize per winner will be: ${prizeShare.toLocaleString()} CHESS tokens`);

      console.log('[6/10] Recording winnings to `lottery_winnings` table...');
      for (const winner of winners) {
        console.log(`  -> Preparing to insert win for FID: ${winner.player_fid}, Ticket ID: ${winner.id}, Amount: ${prizeShare}`);
        await client.query(`
          INSERT INTO lottery_winnings (player_fid, draw_id, ticket_id, amount_won)
          VALUES ($1, $2, $3, $4)
        `, [winner.player_fid, round.id, winner.id, prizeShare]);
        console.log(`  ✅ Successfully inserted win for FID: ${winner.player_fid}`);
      }
      console.log('✅ All winnings recorded.');

      // HELYES LOGIKA: Ha van nyertes, a következő kör jackpotja fixen 1,000,000.
      nextPrizePool = 1000000;
      console.log('-> Next prize pool set to 1,000,000 because there was a winner.');
      
    } else {
      console.log('❌ No winners found for the fixed number. Jackpot will roll over.');
      // HELYES LOGIKA: Nincs nyertes, a jackpot halmozódik a jutalékkal.
      nextPrizePool = currentJackpot + Math.floor(ticketSales * 0.7);
    }

    console.log(`[7/10] Updating current round #${round.draw_number} to 'completed'...`);
    await client.query(`
      UPDATE lottery_draws 
      SET status = 'completed', winning_number = $1, total_tickets = $2
      WHERE id = $3
    `, [winningNumber, totalTicketsSold, round.id]);
    console.log('✅ Round updated.');

    console.log('[8/10] Creating next lottery round...');
    await createNextRound(client, nextPrizePool);
    
    console.log('[9/10] Committing transaction...');
    await client.query('COMMIT');
    console.log('✅✅✅ Transaction committed successfully! Draw is complete. ✅✅✅');
    
    console.log(`🎯 Next round prize pool: ${nextPrizePool.toLocaleString()} CHESS tokens`);
    
  } catch (error) {
    console.error('❌❌❌ AN ERROR OCCURRED! ❌❌❌');
    console.error('Error details:', error);
    console.log('Rolling back transaction due to error...');
    await client.query('ROLLBACK');
    console.log('Transaction rolled back.');
    throw error;
  } finally {
    console.log('[10/10] Releasing database client.');
    client.release();
    console.log('🏁 --- Draw Script Finished --- 🏁');
  }
}

async function createNextRound(client, prizePool) {
  const nextRoundNumberResult = await client.query(`SELECT COALESCE(MAX(draw_number), 0) + 1 as next_round FROM lottery_draws`);
  const roundNumber = nextRoundNumberResult.rows[0].next_round;
  
  console.log(`  -> Next round will be #${roundNumber} with a jackpot of ${prizePool.toLocaleString()}`);
  await client.query(`
    INSERT INTO lottery_draws (
      draw_number, start_time, end_time, jackpot, status, total_tickets
    ) VALUES (
      $1, NOW(), NOW() + INTERVAL '1 day', $2, 'active', 0
    )
  `, [roundNumber, prizePool]);
  console.log(`  ✅ New round #${roundNumber} created.`);
}

if (require.main === module) {
  performLotteryDraw()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { performLotteryDraw };