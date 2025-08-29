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
        await client.query('DELETE FROM lottery_tickets');
        await client.query('DELETE FROM lottery_draws');
        await client.query('DELETE FROM lottery_stats');
        
        // Recreate initial data
        await client.query(`
          INSERT INTO lottery_stats (total_tickets, active_tickets, total_jackpot, next_draw_time, last_draw_number)
          VALUES (0, 0, 1000000, NOW() + INTERVAL '1 day', 0)
        `);
        
        await client.query(`
          INSERT INTO lottery_draws (
            draw_number, start_time, end_time, jackpot, status
          ) VALUES (
            1, NOW(), NOW() + INTERVAL '1 day', 1000000, 'active'
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
          SELECT id FROM lottery_draws WHERE status = 'active' LIMIT 1
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
            INSERT INTO lottery_tickets (draw_id, player_fid, player_address, player_name, number)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (draw_id, number) DO NOTHING
          `, [roundId, testFid, '0x1234567890abcdef', 'TestUser', number]);
        }
        
        // Update draw ticket count
        await client.query(`
          UPDATE lottery_draws 
          SET total_tickets = (
            SELECT COUNT(*) FROM lottery_tickets WHERE draw_id = $1
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
          SELECT * FROM lottery_draws WHERE status = 'active' LIMIT 1
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
          SELECT * FROM lottery_tickets WHERE draw_id = $1
        `, [round.id]);
        
        if (ticketsResult.rows.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'No tickets found for this round' 
          });
        }
        
        // Generate winning number
        const winningNumber = Math.floor(Math.random() * 100) + 1;
        const winnerTicket = ticketsResult.rows.find(ticket => ticket.number === winningNumber);
        
        // Complete round
        await client.query(`
          UPDATE lottery_draws 
          SET status = 'completed', 
              winning_number = $1, 
              updated_at = NOW()
          WHERE id = $2
        `, [winningNumber, round.id]);
        
        // Update stats
        await client.query(`
          UPDATE lottery_stats 
          SET last_draw_number = last_draw_number + 1,
              total_tickets = total_tickets + $1
          WHERE id = 1
        `, [ticketsResult.rows.length]);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Draw simulation completed',
          winning_number: winningNumber,
          winner_fid: winnerTicket?.player_fid || null,
          total_tickets: ticketsResult.rows.length
        });
      }
      
      if (action === 'simulate_new_round') {
        // Simulate creating new round
        const lastRoundResult = await client.query(`
          SELECT * FROM lottery_draws 
          WHERE status = 'completed' 
          ORDER BY draw_number DESC LIMIT 1
        `);
        
        let newJackpot = 1000000;
        
        if (lastRoundResult.rows.length > 0) {
          const lastRound = lastRoundResult.rows[0];
          const lastRoundTickets = lastRound.total_tickets || 0;
          const ticketRevenue = lastRoundTickets * 20000;
          const carryOverAmount = Math.floor(ticketRevenue * 0.7);
          newJackpot = 1000000 + carryOverAmount;
        }
        
        const nextDrawNumber = (lastRoundResult.rows[0]?.draw_number || 0) + 1;
        const now = new Date();
        const startTime = new Date(now);
        const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        const newRoundResult = await client.query(`
          INSERT INTO lottery_draws (
            draw_number, start_time, end_time, jackpot, status
          ) VALUES ($1, $2, $3, $4, 'active')
          RETURNING *
        `, [nextDrawNumber, startTime, endTime, newJackpot]);
        
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
