// /api/draw-winner/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL || 'postgresql://test:test@localhost:5432/test',
});

// Definiáljuk a konstans alap főnyereményt
const BASE_JACKPOT = 1000000;

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

      // Generate random winning number from 1-100
      const winningNumber = Math.floor(Math.random() * 100) + 1;

      // Find the winner
      const winnerResult = await client.query(`
        SELECT * FROM lottery_tickets 
        WHERE draw_id = $1 AND number = $2
        LIMIT 1
      `, [round.id, winningNumber]);

      const winner = winnerResult.rows[0];

      // Calculate revenue and amounts
      const totalTickets = ticketsResult.rows.length || 0;
      const totalRevenue = totalTickets * 100000; // 100,000 CHESS per ticket
      const carryOverAmount = Math.floor(totalRevenue * 0.7); // 70% for jackpot
      const treasuryAmount = totalRevenue - carryOverAmount; // 30% for treasury

      // ### ÚJ LOGIKA A KÖVETKEZŐ KÖR FŐNYEREMÉNYÉNEK KISZÁMÍTÁSÁHOZ ###
      let newRoundJackpot;
      if (winner) {
        // Ha van nyertes, a következő kör jackpotja visszaáll az alap 1M-ra.
        newRoundJackpot = BASE_JACKPOT;
      } else {
        // Ha nincs nyertes, az aktuális kör jackpotja növekszik a bevétel 70%-ával.
        // A 'round.jackpot' már tartalmazza az összes korábbi halmozódást.
        newRoundJackpot = (round.jackpot || 0) + carryOverAmount;
      }
      
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

      // Create new round with the correctly calculated jackpot
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
      `, [round.draw_number, newRoundJackpot]);

      // Update lottery stats
      // A total_jackpot itt a kincstárba kerülő összeget jelenti, vagy a következő kör jackpotját?
      // A biztonság kedvéért a következő kör jackpotját írjuk be, ahogy az eredeti kódban is volt.
      await client.query(`
        UPDATE lottery_stats 
        SET 
          total_tickets = total_tickets + $1,
          total_jackpot = $2,
          last_draw_number = $3,
          next_draw_time = NOW() + INTERVAL '1 day',
          updated_at = NOW()
        WHERE id = 1
      `, [totalTickets, newRoundJackpot, round.draw_number]);

      await client.query('COMMIT');

      if (winner) {
        return NextResponse.json({
          success: true,
          hasWinner: true,
          winner: {
            fid: winner.player_fid,
            number: winningNumber,
            player_name: winner.player_name,
            player_address: winner.player_address,
            // A nyertes a TELJES felhalmozódott jackpotot kapja, nem csak a bevételt
            jackpot_won: round.jackpot 
          },
          round: {
            id: round.id,
            draw_number: round.draw_number,
            total_tickets: totalTickets,
            total_revenue: totalRevenue,
            treasury_amount: treasuryAmount
          },
          new_round: {
            id: newRoundResult.rows[0].id,
            draw_number: newRoundResult.rows[0].draw_number,
            jackpot: newRoundResult.rows[0].jackpot // Ez 1,000,000 lesz
          },
          message: "Winner found! Next round jackpot resets to 1,000,000."
        });
      } else {
        return NextResponse.json({
          success: true,
          hasWinner: false,
          winning_number: winningNumber,
          message: "No winner found - jackpot increases for the next round",
          round: {
            id: round.id,
            draw_number: round.draw_number,
            total_tickets: totalTickets,
            total_revenue: totalRevenue,
            carry_over_to_jackpot: carryOverAmount,
            treasury_amount: treasuryAmount
          },
          new_round: {
            id: newRoundResult.rows[0].id,
            draw_number: newRoundResult.rows[0].draw_number,
            jackpot: newRoundResult.rows[0].jackpot // Ez a (régi jackpot + carryOverAmount) lesz
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
    return NextResponse.json(
      { success: false, error: `Failed to draw winner: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}