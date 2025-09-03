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
    
    // Check if tables exist, if not, run migration
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lambo_lottery_rounds'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📋 Tables not found, running migration...');
      await runMigration(client);
    }
    
    // Optionally force the draw by setting draw_date to NOW() for active rounds
    if (forceNow) {
      console.log('⏱️ FORCE NOW enabled – setting draw_date to NOW() for active rounds...');
      await client.query(`
        UPDATE lambo_lottery_rounds
        SET draw_date = NOW(), updated_at = NOW()
        WHERE status = 'active';
      `);
    }

    // Get current active round which is due for drawing
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

async function runMigration(client) {
  console.log('🔧 Running lambo lottery migration...');
  
  // Create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS lambo_lottery_rounds (
        id SERIAL PRIMARY KEY,
        round_number INTEGER NOT NULL UNIQUE,
        start_date TIMESTAMP NOT NULL DEFAULT NOW(),
        end_date TIMESTAMP NOT NULL,
        draw_date TIMESTAMP NOT NULL,
        prize_pool BIGINT NOT NULL DEFAULT 1000000,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        winner_fid INTEGER,
        winner_number INTEGER,
        total_tickets_sold INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS lambo_lottery_tickets (
        id SERIAL PRIMARY KEY,
        round_id INTEGER NOT NULL REFERENCES lambo_lottery_rounds(id),
        fid INTEGER NOT NULL,
        ticket_number INTEGER NOT NULL,
        purchase_price BIGINT NOT NULL DEFAULT 20000,
        purchased_at TIMESTAMP DEFAULT NOW(),
        transaction_hash VARCHAR(66),
        UNIQUE(round_id, ticket_number)
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS lambo_lottery_stats (
        id SERIAL PRIMARY KEY,
        total_rounds INTEGER DEFAULT 0,
        total_tickets_sold INTEGER DEFAULT 0,
        total_prize_distributed BIGINT DEFAULT 0,
        treasury_balance BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Create indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_lambo_tickets_round_fid ON lambo_lottery_tickets(round_id, fid);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_lambo_tickets_number ON lambo_lottery_tickets(round_id, ticket_number);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_lambo_rounds_status ON lambo_lottery_rounds(status);`);
  
  // Insert initial data
  await client.query(`
    INSERT INTO lambo_lottery_stats (id, total_rounds, total_tickets_sold, total_prize_distributed, treasury_balance)
    VALUES (1, 0, 0, 0, 0)
    ON CONFLICT (id) DO NOTHING;
  `);
  
  await client.query(`
    INSERT INTO lambo_lottery_rounds (
        round_number, start_date, end_date, draw_date, prize_pool, status
    ) VALUES (
        1, NOW(), NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '1 hour', 1000000, 'active'
    ) ON CONFLICT (round_number) DO NOTHING;
  `);
  
  console.log('✅ Migration completed successfully');
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