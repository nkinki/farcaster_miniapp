const { Pool } = require('pg');

// Check lottery data and ticket associations
async function checkLotteryData() {
  console.log('🔍 Checking lottery data and ticket associations...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Check all lottery rounds
    console.log('\n📊 LOTTERY ROUNDS:');
    const roundsResult = await client.query(`
      SELECT 
        id, 
        draw_number, 
        status, 
        jackpot, 
        total_tickets,
        start_time,
        end_time,
        winning_number
      FROM lottery_draws 
      ORDER BY draw_number ASC
    `);
    
    roundsResult.rows.forEach(round => {
      console.log(`Round #${round.draw_number}: ID=${round.id}, Status=${round.status}, Jackpot=${round.jackpot.toLocaleString()}, Tickets=${round.total_tickets}, Winner=${round.winning_number || 'None'}`);
    });
    
    // Check all lottery tickets
    console.log('\n🎫 LOTTERY TICKETS:');
    const ticketsResult = await client.query(`
      SELECT 
        id,
        draw_id,
        player_fid,
        number,
        purchase_price,
        created_at
      FROM lottery_tickets 
      ORDER BY draw_id ASC, number ASC
    `);
    
    ticketsResult.rows.forEach(ticket => {
      console.log(`Ticket #${ticket.number}: Draw ID=${ticket.draw_id}, FID=${ticket.player_fid}, Price=${ticket.purchase_price}, Date=${ticket.created_at}`);
    });
    
    // Check ticket distribution by round
    console.log('\n📈 TICKET DISTRIBUTION BY ROUND:');
    const distributionResult = await client.query(`
      SELECT 
        lt.draw_id,
        ld.draw_number,
        COUNT(*) as ticket_count,
        SUM(lt.purchase_price) as total_revenue
      FROM lottery_tickets lt
      JOIN lottery_draws ld ON lt.draw_id = ld.id
      GROUP BY lt.draw_id, ld.draw_number
      ORDER BY ld.draw_number ASC
    `);
    
    distributionResult.rows.forEach(dist => {
      console.log(`Round #${dist.draw_number}: ${dist.ticket_count} tickets, Revenue: ${dist.total_revenue.toLocaleString()} CHESS`);
    });
    
    // Check expected vs actual jackpots
    console.log('\n💰 JACKPOT ANALYSIS:');
    for (let i = 1; i < roundsResult.rows.length; i++) {
      const currentRound = roundsResult.rows[i];
      const previousRound = roundsResult.rows[i - 1];
      
      if (previousRound.status === 'completed') {
        const ticketsInPreviousRound = ticketsResult.rows.filter(t => t.draw_id === previousRound.id).length;
        const expectedRevenue = ticketsInPreviousRound * 100000; // 100k per ticket
        const expectedCarryOver = Math.floor(expectedRevenue * 0.7);
        const expectedJackpot = 1000000 + expectedCarryOver;
        
        console.log(`Round #${currentRound.draw_number}:`);
        console.log(`  Previous round tickets: ${ticketsInPreviousRound}`);
        console.log(`  Expected revenue: ${expectedRevenue.toLocaleString()} CHESS`);
        console.log(`  Expected carryover (70%): ${expectedCarryOver.toLocaleString()} CHESS`);
        console.log(`  Expected jackpot: ${expectedJackpot.toLocaleString()} CHESS`);
        console.log(`  Actual jackpot: ${currentRound.jackpot.toLocaleString()} CHESS`);
        console.log(`  Difference: ${(currentRound.jackpot - expectedJackpot).toLocaleString()} CHESS`);
        console.log('');
      }
    }
    
    client.release();
    await pool.end();
    
    console.log('🎉 Lottery data check completed!');
    
  } catch (error) {
    console.error('❌ Error checking lottery data:', error);
    process.exit(1);
  }
}

// Run check
checkLotteryData();
