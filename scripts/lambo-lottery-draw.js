const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function performLotteryDraw() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🎰 Starting lottery draw...');
    const forceNow = process.env.FORCE_DRAW_NOW === 'true' || process.argv.includes('--force-now');
    
    // Get current active round which is due for drawing
    let roundResult = await client.query(`
      SELECT * FROM lottery_draws 
      WHERE status = 'active' AND end_time <= NOW()
      ORDER BY draw_number DESC 
      LIMIT 1
    `);
    
    if (roundResult.rows.length === 0) {
      if (forceNow) {
        console.log('⚙️ No due rounds after force; adjusting active round end_time to NOW()...');
        // Try update any active round to be due now
        const upd = await client.query(`
          UPDATE lottery_draws
          SET end_time = NOW()
          WHERE status = 'active'
          RETURNING *;
        `);
        if (upd.rows.length === 0) {
          console.log('🆕 Creating initial active round for immediate draw...');
          // Create an active round if none exists
          await client.query(`
            INSERT INTO lottery_draws (
              draw_number, start_time, end_time, jackpot, status, total_tickets
            ) VALUES (
              1,
              NOW(),
              NOW(),
              1000000,
              'active',
              0
            ) ON CONFLICT (draw_number) DO NOTHING;
          `);
        }
        // Reselect after adjustment/creation
        roundResult = await client.query(`
          SELECT * FROM lottery_draws 
          WHERE status = 'active' AND end_time <= NOW()
          ORDER BY draw_number DESC 
          LIMIT 1
        `);
      }
      if (roundResult.rows.length === 0) {
        console.log('ℹ️ No rounds ready for drawing');
        await client.query('ROLLBACK');
        return;
      }
    }
    
    const round = roundResult.rows[0];
    console.log(`🎯 Drawing for Round #${round.draw_number}`);
    
    // Get all tickets for this round
    const ticketsResult = await client.query(`
      SELECT * FROM lottery_tickets 
      WHERE draw_id = $1
      ORDER BY number ASC
    `, [round.id]);
    
    if (ticketsResult.rows.length === 0) {
      console.log('❌ No tickets sold for this round');
      
      // Mark round as completed without winner
      await client.query(`
        UPDATE lottery_draws 
        SET status = 'completed', updated_at = NOW()
        WHERE id = $1
      `, [round.id]);
      
      // Create next round with same prize pool
      await createNextRound(client, round.jackpot);
      
      await client.query('COMMIT');
      console.log('✅ Round completed without winner, prize pool carried over');
      return;
    }
    
    // Pick random winning ticket
    const randomIndex = Math.floor(Math.random() * ticketsResult.rows.length);
    const winningTicket = ticketsResult.rows[randomIndex];
    
    console.log(`🏆 Winning ticket: #${winningTicket.number} (FID: ${winningTicket.player_fid})`);
    
    // Update round with winner
    await client.query(`
      UPDATE lottery_draws 
      SET status = 'completed', 
          winning_number = $1,
          total_tickets = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [winningTicket.number, ticketsResult.rows.length, round.id]);
    
    // Calculate next round prize pool (70% of current sales + base 1M)
    const ticketSales = ticketsResult.rows.length * 20000; // 20k per ticket
    const nextPrizePool = 1000000 + Math.floor(ticketSales * 0.7);
    
    // Create next round
    await createNextRound(client, nextPrizePool);
    
    await client.query('COMMIT');
    
    console.log(`✅ Lottery draw completed!`);
    console.log(`🏆 Winner: FID ${winningTicket.player_fid}, Ticket #${winningTicket.number}`);
    console.log(`💰 Prize: ${round.jackpot.toLocaleString()} CHESS tokens`);
    console.log(`🎯 Next round prize pool: ${nextPrizePool.toLocaleString()} CHESS tokens`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during lottery draw:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function createNextRound(client, prizePool) {
  const nextRoundNumber = await client.query(`
    SELECT COALESCE(MAX(draw_number), 0) + 1 as next_round
    FROM lottery_draws
  `);
  
  const roundNumber = nextRoundNumber.rows[0].next_round;
  
  await client.query(`
    INSERT INTO lottery_draws (
      draw_number, 
      start_time, 
      end_time, 
      jackpot, 
      status,
      total_tickets
    ) VALUES (
      $1,
      NOW(),
      NOW() + INTERVAL '1 day',
      $2,
      'active',
      0
    )
  `, [roundNumber, prizePool]);
  
  console.log(`🆕 Created Round #${roundNumber} with prize pool: ${prizePool.toLocaleString()} CHESS`);
}

// Run the draw
if (require.main === module) {
  performLotteryDraw()
    .then(() => {
      console.log('🎰 Lottery draw script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Lottery draw script failed:', error);
      process.exit(1);
    });
}

module.exports = { performLotteryDraw };