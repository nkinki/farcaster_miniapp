const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function performLotteryDraw() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🎰 Starting lottery draw...');
    
    // Get current active round
    const roundResult = await client.query(`
      SELECT * FROM lambo_lottery_rounds 
      WHERE status = 'active' AND draw_date <= NOW()
      ORDER BY round_number DESC 
      LIMIT 1
    `);
    
    if (roundResult.rows.length === 0) {
      console.log('ℹ️ No rounds ready for drawing');
      await client.query('ROLLBACK');
      return;
    }
    
    const round = roundResult.rows[0];
    console.log(`🎯 Drawing for Round #${round.round_number}`);
    
    // Get all tickets for this round
    const ticketsResult = await client.query(`
      SELECT * FROM lambo_lottery_tickets 
      WHERE round_id = $1
      ORDER BY ticket_number ASC
    `, [round.id]);
    
    if (ticketsResult.rows.length === 0) {
      console.log('❌ No tickets sold for this round');
      
      // Mark round as completed without winner
      await client.query(`
        UPDATE lambo_lottery_rounds 
        SET status = 'completed', updated_at = NOW()
        WHERE id = $1
      `, [round.id]);
      
      // Create next round with same prize pool
      await createNextRound(client, round.prize_pool);
      
      await client.query('COMMIT');
      console.log('✅ Round completed without winner, prize pool carried over');
      return;
    }
    
    // Pick random winning ticket
    const randomIndex = Math.floor(Math.random() * ticketsResult.rows.length);
    const winningTicket = ticketsResult.rows[randomIndex];
    
    console.log(`🏆 Winning ticket: #${winningTicket.ticket_number} (FID: ${winningTicket.fid})`);
    
    // Update round with winner
    await client.query(`
      UPDATE lambo_lottery_rounds 
      SET status = 'completed', 
          winner_fid = $1, 
          winner_number = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [winningTicket.fid, winningTicket.ticket_number, round.id]);
    
    // Update stats
    await client.query(`
      UPDATE lambo_lottery_stats 
      SET total_rounds = total_rounds + 1,
          total_prize_distributed = total_prize_distributed + $1,
          updated_at = NOW()
      WHERE id = 1
    `, [round.prize_pool]);
    
    // Calculate next round prize pool (70% of current sales + base 1M)
    const ticketSales = ticketsResult.rows.length * 20000; // 20k per ticket
    const nextPrizePool = 1000000 + Math.floor(ticketSales * 0.7);
    
    // Create next round
    await createNextRound(client, nextPrizePool);
    
    await client.query('COMMIT');
    
    console.log(`✅ Lottery draw completed!`);
    console.log(`🏆 Winner: FID ${winningTicket.fid}, Ticket #${winningTicket.ticket_number}`);
    console.log(`💰 Prize: ${round.prize_pool.toLocaleString()} CHESS tokens`);
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
    SELECT COALESCE(MAX(round_number), 0) + 1 as next_round
    FROM lambo_lottery_rounds
  `);
  
  const roundNumber = nextRoundNumber.rows[0].next_round;
  
  await client.query(`
    INSERT INTO lambo_lottery_rounds (
      round_number, 
      start_date, 
      end_date, 
      draw_date, 
      prize_pool, 
      status
    ) VALUES (
      $1,
      NOW(),
      NOW() + INTERVAL '1 day',
      NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
      $2,
      'active'
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