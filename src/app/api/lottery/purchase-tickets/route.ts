import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { fid, ticketNumbers, playerAddress, playerName, playerAvatar } = await request.json();
    
    if (!fid || !ticketNumbers || !Array.isArray(ticketNumbers) || ticketNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    if (ticketNumbers.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 tickets can be purchased at once' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current active round
      const roundResult = await client.query(`
        SELECT id, total_tickets FROM lottery_draws 
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

      const round = roundResult.rows[0];
      const currentTickets = round.total_tickets || 0;

      // Check if there are enough available numbers
      if (currentTickets + ticketNumbers.length > 100) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Not enough available ticket numbers' },
          { status: 400 }
        );
      }

      // Check if any of the requested numbers are already taken
      const existingTickets = await client.query(`
        SELECT number FROM lottery_tickets 
        WHERE draw_id = $1 AND number = ANY($2)
      `, [round.id, ticketNumbers]);

      if (existingTickets.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Some ticket numbers are already taken',
            takenNumbers: existingTickets.rows.map(t => t.number)
          },
          { status: 400 }
        );
      }

      // Insert tickets
      const insertedTickets = [];
      for (const number of ticketNumbers) {
        const ticketResult = await client.query(`
          INSERT INTO lottery_tickets (
            draw_id, player_fid, player_address, player_name, player_avatar, number
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [round.id, fid, playerAddress || '0x0000000000000000000000000000000000000000', playerName || 'Anonymous', playerAvatar || '', number]);
        
        insertedTickets.push(ticketResult.rows[0]);
      }

      // Update round ticket count
      await client.query(`
        UPDATE lottery_draws 
        SET total_tickets = total_tickets + $1
        WHERE id = $2
      `, [ticketNumbers.length, round.id]);

      // Update stats
      await client.query(`
        UPDATE lottery_stats 
        SET total_tickets = total_tickets + $1,
            active_tickets = active_tickets + $1
        WHERE id = 1
      `, [ticketNumbers.length]);

      await client.query('COMMIT');

      return NextResponse.json({ 
        success: true, 
        message: `Successfully purchased ${ticketNumbers.length} tickets`,
        tickets: insertedTickets,
        round_id: round.id,
        total_cost: ticketNumbers.length * 20000 // 20,000 CHESS per ticket
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error purchasing tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purchase tickets' },
      { status: 500 }
    );
  }
}