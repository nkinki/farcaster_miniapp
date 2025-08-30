// /api/test-simulation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL || 'postgresql://test:test@localhost:5432/test',
});

// Alap főnyeremény (jackpot) konstansként definiálva
const BASE_JACKPOT = 1000000;

export async function POST(request: NextRequest) {
  try {
    const { action, testFid = 12345 } = await request.json();
    const client = await pool.connect();
    
    try {
      if (action === 'reset') {
        // Minden lottóadat törlése teszteléshez
        await client.query('BEGIN');
        await client.query('DELETE FROM lottery_tickets');
        await client.query('DELETE FROM lottery_draws');
        await client.query('DELETE FROM lottery_stats');
        
        // Kezdeti adatok újbóli létrehozása 1M alap főnyereménnyel
        await client.query(`
          INSERT INTO lottery_stats (id, total_tickets, active_tickets, total_jackpot, next_draw_time, last_draw_number)
          VALUES (1, 0, 0, $1, NOW() + INTERVAL '1 day', 0)
        `, [BASE_JACKPOT]);
        
        // Első sorsolási kör létrehozása 1M alap főnyereménnyel
        await client.query(`
            INSERT INTO lottery_draws (
              draw_number, start_time, end_time, jackpot, status
            ) VALUES (
              1, NOW(), NOW() + INTERVAL '1 day', $1, 'active'
            )
          `, [BASE_JACKPOT]);
        
        await client.query('COMMIT');
        
        return NextResponse.json({ 
          success: true, 
          message: 'Lottery data reset successfully with 1,000,000 base jackpot' 
        });
      }
      
      if (action === 'simulate_purchase') {
        // Szelvényvásárlás szimulációja
        const roundResult = await client.query(`
          SELECT id FROM lottery_draws WHERE status = 'active' LIMIT 1
        `);
        
        if (roundResult.rows.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'No active round found' 
          }, { status: 400 });
        }
        
        const roundId = roundResult.rows[0].id;
        const testNumbers = [7, 13, 42, 69, 99]; // Teszt szelvények
        
        for (const number of testNumbers) {
          await client.query(`
            INSERT INTO lottery_tickets (draw_id, player_fid, player_address, player_name, number)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (draw_id, number) DO NOTHING
          `, [roundId, testFid, '0x1234567890abcdef', 'TestUser', number]);
        }
        
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
        // Sorsolás szimulációja
        const roundResult = await client.query(`
          SELECT * FROM lottery_draws WHERE status = 'active' LIMIT 1
        `);
        
        if (roundResult.rows.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'No active round found' 
          }, { status: 400 });
        }
        
        const round = roundResult.rows[0];
        
        const ticketsResult = await client.query(`
          SELECT * FROM lottery_tickets WHERE draw_id = $1
        `, [round.id]);
        
        if (ticketsResult.rows.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'No tickets found for this round' 
          }, { status: 400 });
        }
        
        const winningNumber = Math.floor(Math.random() * 100) + 1;
        const winnerTicket = ticketsResult.rows.find(ticket => ticket.number === winningNumber);
        
        await client.query(`
          UPDATE lottery_draws 
          SET status = 'completed', 
              winning_number = $1,
              end_time = NOW()
          WHERE id = $2
        `, [winningNumber, round.id]);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Draw simulation completed',
          winning_number: winningNumber,
          winner_fid: winnerTicket?.player_fid || null,
          total_tickets: ticketsResult.rows.length
        });
      }
      
      if (action === 'simulate_new_round') {
        // Új forduló létrehozásának szimulációja a helyes logikával
        const lastRoundResult = await client.query(`
          SELECT * FROM lottery_draws 
          WHERE status = 'completed' 
          ORDER BY draw_number DESC LIMIT 1
        `);
        
        if (lastRoundResult.rows.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No completed round found to start a new one from. Run simulate_draw first.'
          }, { status: 400 });
        }

        const lastRound = lastRoundResult.rows[0];
        let newJackpot;

        // Ellenőrizzük, hogy volt-e nyertes az előző körben
        const winnerResult = await client.query(`
            SELECT id FROM lottery_tickets 
            WHERE draw_id = $1 AND number = $2
        `, [lastRound.id, lastRound.winning_number]);

        const hasWinner = winnerResult.rows.length > 0;

        if (hasWinner) {
            // Ha volt nyertes, a jackpot visszaáll az alapértelmezett 1M-ra
            newJackpot = BASE_JACKPOT;
        } else {
            // Ha nem volt nyertes, a jackpot halmozódik
            const lastRoundTickets = lastRound.total_tickets || 0;
            const ticketRevenue = lastRoundTickets * 100000; // 100,000 per ticket
            const carryOverAmount = Math.floor(ticketRevenue * 0.7);
            
            // Az előző kör jackpotjához hozzáadjuk a bevétel 70%-át
            newJackpot = (lastRound.jackpot || 0) + carryOverAmount;
        }
        
        const nextDrawNumber = lastRound.draw_number + 1;
        
        // Ellenőrizzük, hogy létezik-e már ilyen sorszámú kör
        const existingDraw = await client.query(`
          SELECT id FROM lottery_draws WHERE draw_number = $1
        `, [nextDrawNumber]);
        
        if (existingDraw.rows.length > 0) {
           return NextResponse.json({ 
            success: false, 
            error: `Draw number ${nextDrawNumber} already exists. Cannot create a new round.`
          }, { status: 409 }); // 409 Conflict
        }

        // Új aktív kör beszúrása a kiszámolt jackpottal
        const newRoundResult = await client.query(`
          INSERT INTO lottery_draws (
            draw_number, start_time, end_time, jackpot, status
          ) VALUES ($1, NOW(), NOW() + INTERVAL '1 day', $2, 'active')
          RETURNING *
        `, [nextDrawNumber, newJackpot]);
        
        // Statisztikák frissítése az új kör adataival
        await client.query(`
            UPDATE lottery_stats
            SET next_draw_time = $1,
                last_draw_number = $2,
                total_jackpot = $3
            WHERE id = 1
        `, [newRoundResult.rows[0].end_time, lastRound.draw_number, newJackpot]);

        return NextResponse.json({ 
          success: true, 
          message: 'New round created successfully with correct jackpot logic.',
          new_round: newRoundResult.rows[0]
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Use: reset, simulate_purchase, simulate_draw, or simulate_new_round' 
      }, { status: 400 });
      
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