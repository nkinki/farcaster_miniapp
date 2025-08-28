import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { fid, round_id, ticket_numbers } = await request.json();

    if (!fid || !round_id || !ticket_numbers || !Array.isArray(ticket_numbers)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    if (ticket_numbers.length === 0 || ticket_numbers.length > 10) {
      return NextResponse.json(
        { success: false, error: 'You can purchase 1-10 tickets at once' },
        { status: 400 }
      );
    }

    // Validate ticket numbers (1-100)
    const invalidNumbers = ticket_numbers.filter(num => num < 1 || num > 100);
    if (invalidNumbers.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ticket numbers must be between 1-100' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if round is active
      const roundResult = await client.query(`
        SELECT * FROM lambo_lottery_rounds 
        WHERE id = $1 AND status = 'active'
      `, [round_id]);

      if (roundResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Round is not active' },
          { status: 400 }
        );
      }

      const round = roundResult.rows[0];

      // Check if draw time has passed
      if (new Date() > new Date(round.draw_date)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Ticket sales have ended for this round' },
          { status: 400 }
        );
      }

      // Check if tickets are already taken
      const existingTicketsResult = await client.query(`
        SELECT ticket_number FROM lambo_lottery_tickets 
        WHERE round_id = $1 AND ticket_number = ANY($2)
      `, [round_id, ticket_numbers]);

      if (existingTicketsResult.rows.length > 0) {
        const takenNumbers = existingTicketsResult.rows.map(row => row.ticket_number);
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: `Tickets already taken: ${takenNumbers.join(', ')}` },
          { status: 400 }
        );
      }

      // Check if total tickets would exceed 100
      const totalTicketsResult = await client.query(`
        SELECT COUNT(*) as count FROM lambo_lottery_tickets 
        WHERE round_id = $1
      `, [round_id]);

      const currentTicketCount = parseInt(totalTicketsResult.rows[0].count);
      if (currentTicketCount + ticket_numbers.length > 100) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Not enough tickets available' },
          { status: 400 }
        );
      }

      // Insert tickets
      const ticketPrice = 20000; // 20,000 CHESS tokens
      const purchasedTickets = [];

      for (const ticketNumber of ticket_numbers) {
        const ticketResult = await client.query(`
          INSERT INTO lambo_lottery_tickets (round_id, fid, ticket_number, purchase_price)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [round_id, fid, ticketNumber, ticketPrice]);
        
        purchasedTickets.push(ticketResult.rows[0]);
      }

      // Update round ticket count
      await client.query(`
        UPDATE lambo_lottery_rounds 
        SET total_tickets_sold = total_tickets_sold + $1,
            prize_pool = prize_pool + $2
        WHERE id = $3
      `, [ticket_numbers.length, ticket_numbers.length * ticketPrice * 0.7, round_id]);

      // Update lottery stats
      await client.query(`
        UPDATE lambo_lottery_stats 
        SET total_tickets_sold = total_tickets_sold + $1,
            treasury_balance = treasury_balance + $2
        WHERE id = 1
      `, [ticket_numbers.length, ticket_numbers.length * ticketPrice * 0.3]);

      await client.query('COMMIT');

      return NextResponse.json({ 
        success: true, 
        tickets: purchasedTickets,
        message: `Successfully purchased ${ticket_numbers.length} ticket(s)`
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