import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { action, testFid = 12345 } = await request.json();
    const client = await pool.connect();
    
    try {
      if (action === 'reset') {
        // Reset all lottery data for testing
        await client.query('DELETE FROM lambo_lottery_tickets');
        await client.query('DELETE FROM lambo_lottery_rounds');
        await client.query('DELETE FROM lambo_lottery_stats');
        
        // Recreate initial data
        await client.query(`
          INSERT INTO lambo_lottery_stats (id, total_rounds, total_tickets_sold, total_prize_distributed, treasury_balance)
          VALUES (1, 0, 0, 0, 0)
        `);
        
        await client.query(`
          INSERT INTO lambo_lottery_rounds (
            round_number, start_date, end_date, draw_date, prize_pool, status
          ) VALUES (
            1, NOW(), NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '1 hour', 1000000, 'active'
          )
        `);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Lottery data reset successfully' 
        });
      }
      
      if (action === 'simulate_purchase') {
        // Simulate ticket purchase
        const roundResult = await client.query(`
          SELECT id FROM lambo_lottery_rounds WHERE status = 'active' LIMIT 1
        `);
        
        if (roundResult.rows.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'No active round found' 
          });
        }
        
        const roundId = roundResult.rows[0].id;
        const testNumbers = [7, 13, 42, 69, 99]; // Test ticket numbers
        
        // Insert test tickets
        for (const number of testNumbers) {
          await client.query(`
            INSERT INTO lambo_lottery_tickets (round_id, fid, ticket_number, purchase_price)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (round_id, ticket_number) DO NOTHING
          `, [roundId, testFid, number, 20000]);
        }
        
        // Update round ticket count
        await client.query(`
          UPDATE lambo_lottery_rounds 
          SET total_tickets_sold = (
            SELECT COUNT(*) FROM lambo_lottery_tickets WHERE round_id = $1
          )
          WHERE id = $1
        `, [roundId]);
        
        return NextResponse.json({ 
          success: true, 
          message: `Simulated purchase of ${testNumbers.length} tickets`,
          tickets: testNumbers,
          round_id: roundId
        });
      }
      
      if (action === 'simulate_draw') {
        // Simulate drawing winner
        const roundResult = await client.query(`
          SELECT * FROM lambo_lottery_rounds WHERE status = 'active' LIMIT 1
        `);
        
        if (roundResult.rows.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'No active round found' 
          });
        }
        
        const round = roundResult.rows[0];
        
        // Get all tickets
        const ticketsResult = await client.query(`
          SELECT * FROM lambo_lottery_tickets WHERE round_id = $1
        `, [round.id]);
        
        if (ticketsResult.rows.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'No tickets found for this round' 
          });
        }
        
        // Generate winning number
        const winningNumber = Math.floor(Math.random() * 100) + 1;
        const winnerTicket = ticketsResult.rows.find(ticket => ticket.ticket_number === winningNumber);
        
        // Complete round
        await client.query(`
          UPDATE lambo_lottery_rounds 
          SET status = 'completed', 
              winner_fid = $1, 
              winner_number = $2, 
              updated_at = NOW()
          WHERE id = $3
        `, [winnerTicket?.fid || null, winningNumber, round.id]);
        
        // Update stats
        await client.query(`
          UPDATE lambo_lottery_stats 
          SET total_rounds = total_rounds + 1,
              total_prize_distributed = total_prize_distributed + $1
          WHERE id = 1
        `, [winnerTicket ? round.prize_pool : 0]);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Draw simulation completed',
          winning_number: winningNumber,
          winner_fid: winnerTicket?.fid || null,
          total_tickets: ticketsResult.rows.length
        });
      }
      
      if (action === 'simulate_new_round') {
        // Simulate creating new round
        const lastRoundResult = await client.query(`
          SELECT * FROM lambo_lottery_rounds 
          WHERE status = 'completed' 
          ORDER BY round_number DESC LIMIT 1
        `);
        
        let newPrizePool = 1000000;
        
        if (lastRoundResult.rows.length > 0) {
          const lastRound = lastRoundResult.rows[0];
          const lastRoundTickets = lastRound.total_tickets_sold || 0;
          const ticketRevenue = lastRoundTickets * 20000;
          const carryOverAmount = Math.floor(ticketRevenue * 0.7);
          newPrizePool = 1000000 + carryOverAmount;
        }
        
        const nextRoundNumber = (lastRoundResult.rows[0]?.round_number || 0) + 1;
        const now = new Date();
        const startDate = new Date(now);
        const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const drawDate = new Date(endDate.getTime() + 60 * 60 * 1000);
        
        const newRoundResult = await client.query(`
          INSERT INTO lambo_lottery_rounds (
            round_number, start_date, end_date, draw_date, prize_pool, status
          ) VALUES ($1, $2, $3, $4, $5, 'active')
          RETURNING *
        `, [nextRoundNumber, startDate, endDate, drawDate, newPrizePool]);
        
        return NextResponse.json({ 
          success: true, 
          message: 'New round created successfully',
          new_round: newRoundResult.rows[0]
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Use: reset, simulate_purchase, simulate_draw, or simulate_new_round' 
      });
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in test simulation:', error);
    return NextResponse.json(
      { success: false, error: 'Test simulation failed' },
      { status: 500 }
    );
  }
}
