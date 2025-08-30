import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL || 'postgresql://test:test@localhost:5432/test',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { round_id } = body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current active round
      let round;
      if (round_id) {
        const roundResult = await client.query(`
          SELECT * FROM lottery_draws 
          WHERE id = $1 AND status = 'active'
        `, [round_id]);
        
        if (roundResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'Invalid or inactive round ID' },
            { status: 400 }
          );
        }
        round = roundResult.rows[0];
      } else {
        const roundResult = await client.query(`
          SELECT * FROM lottery_draws 
          WHERE status = 'active' 
          ORDER BY draw_number DESC 
          LIMIT 1
        `);

        if (roundResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'No active round found' },
            { status: 400 }
          );
        }
        round = roundResult.rows[0];
      }

             // Get all sold tickets for this round
       const ticketsResult = await client.query(`
         SELECT * FROM lottery_tickets 
         WHERE draw_id = $1
         ORDER BY number
       `, [round.id]);

       if (!ticketsResult || !ticketsResult.rows || ticketsResult.rows.length === 0) {
         await client.query('ROLLBACK');
         return NextResponse.json(
           { success: false, error: 'No tickets sold in this round' },
           { status: 400 }
         );
       }

       // Generate random winning number from 1-100 (not from sold tickets)
       const winningNumber = Math.floor(Math.random() * 100) + 1;

       // Find the winner (if any ticket matches the winning number)
       const winnerResult = await client.query(`
         SELECT * FROM lottery_tickets 
         WHERE draw_id = $1 AND number = $2
         LIMIT 1
       `, [round.id, winningNumber]);

       const winner = winnerResult.rows[0];

       // Calculate revenue and new jackpot (70-30 split) - safe calculation
       const totalTickets = ticketsResult.rows.length || 0;
       const totalRevenue = totalTickets * 100000; // 100,000 CHESS per ticket
       
                      // Next round jackpot: ONLY 70% of new revenue (don't accumulate previous jackpot)
       const nextRoundJackpot = Math.floor(totalRevenue * 0.7);
       const treasuryAmount = Math.floor(totalRevenue * 0.3); // 30% to treasury

             // Update current round as completed
       await client.query(`
         UPDATE lottery_draws 
         SET 
           status = 'completed',
           winning_number = $1,
           total_tickets = $2,
           end_time = NOW()
         WHERE id = $3
       `, [winningNumber, totalTickets, round.id]);

      // Create new round with increased jackpot
      const newRoundResult = await client.query(`
        INSERT INTO lottery_draws (
          draw_number, 
          start_time, 
          end_time, 
          jackpot, 
          status
        ) VALUES (
          $1 + 1,
          NOW(),
          NOW() + INTERVAL '1 day',
          $2,
          'active'
        )
        RETURNING *
      `, [round.draw_number, nextRoundJackpot]);

             // Update lottery stats
       await client.query(`
         UPDATE lottery_stats 
         SET 
           total_tickets = total_tickets + $1,
           total_jackpot = $2,
           last_draw_number = $3,
           next_draw_time = NOW() + INTERVAL '1 day',
           updated_at = NOW()
         WHERE id = 1
       `, [totalTickets, nextRoundJackpot, round.draw_number]);

      await client.query('COMMIT');

      // Check if there's a winner
      if (winner) {
        return NextResponse.json({
          success: true,
          hasWinner: true,
          winner: {
            fid: winner.player_fid,
            number: winningNumber,
            player_name: winner.player_name,
            player_address: winner.player_address
          },
          round: {
            id: round.id,
            draw_number: round.draw_number,
            total_tickets: totalTickets,
            total_revenue: totalRevenue,
            next_round_jackpot: nextRoundJackpot,
            treasury_amount: treasuryAmount
          },
          new_round: {
            id: newRoundResult.rows[0].id,
            draw_number: newRoundResult.rows[0].draw_number,
            jackpot: newRoundResult.rows[0].jackpot
          }
        });
      } else {
        // No winner - jackpot increases
        return NextResponse.json({
          success: true,
          hasWinner: false,
          winning_number: winningNumber,
          message: "No winner found - jackpot increases to next round",
          round: {
            id: round.id,
            draw_number: round.draw_number,
            total_tickets: totalTickets,
            total_revenue: totalRevenue,
            next_round_jackpot: nextRoundJackpot,
            treasury_amount: treasuryAmount
          },
          new_round: {
            id: newRoundResult.rows[0].id,
            draw_number: newRoundResult.rows[0].draw_number,
            jackpot: newRoundResult.rows[0].jackpot
          }
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error drawing winner:', error);
    
    // Fallback to mock data for local development
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock draw result for local development');
             const mockResult = {
         success: true,
         hasWinner: true,
         winner: {
           fid: 12345,
           number: 42,
           player_name: "Test Winner",
           player_address: "0x1234...5678"
         },
         round: {
           id: 1,
           draw_number: 1,
           total_tickets: 15,
           total_revenue: 1500000,
           next_round_jackpot: 1050000, // 1.5M carryover (no base)
           treasury_amount: 450000
         },
         new_round: {
           id: 2,
           draw_number: 2,
           jackpot: 1050000
         }
       };
      
      return NextResponse.json(mockResult);
    }
    
    return NextResponse.json(
      { success: false, error: `Failed to draw winner: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
