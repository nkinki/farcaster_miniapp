import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { 
      playerFid, 
      playerAddress, 
      playerName, 
      playerAvatar, 
      side, 
      quantity 
    } = await request.json();

    // Validation
    if (!playerFid || !playerAddress || !side || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['sunny', 'rainy'].includes(side)) {
      return NextResponse.json(
        { success: false, error: 'Invalid side. Must be sunny or rainy' },
        { status: 400 }
      );
    }

    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be between 1 and 10' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current active round
      const roundResult = await client.query(`
        SELECT * FROM weather_lotto_rounds 
        WHERE status = 'active' 
        ORDER BY round_number DESC 
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

      // Check if round has ended
      if (new Date() > new Date(round.end_time)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Round has ended' },
          { status: 400 }
        );
      }

      // Calculate total cost
      const ticketPrice = 100000000000000000000000; // 100k CHESS (18 decimals)
      const totalCost = BigInt(quantity) * BigInt(ticketPrice);

      // Insert ticket record
      const ticketResult = await client.query(`
        INSERT INTO weather_lotto_tickets (
          round_id,
          player_fid,
          player_address,
          player_name,
          player_avatar,
          side,
          quantity,
          total_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        round.id,
        playerFid,
        playerAddress,
        playerName || null,
        playerAvatar || null,
        side,
        quantity,
        totalCost.toString()
      ]);

      // Update round statistics
      const updateField = side === 'sunny' ? 'sunny_tickets' : 'rainy_tickets';
      await client.query(`
        UPDATE weather_lotto_rounds 
        SET 
          ${updateField} = ${updateField} + $1,
          total_tickets = total_tickets + $1,
          total_pool = total_pool + $2,
          updated_at = NOW()
        WHERE id = $3
      `, [quantity, totalCost.toString(), round.id]);

      // Update stats
      await client.query(`
        UPDATE weather_lotto_stats 
        SET 
          total_tickets_sold = total_tickets_sold + $1,
          total_volume = total_volume + $2,
          current_sunny_tickets = CASE 
            WHEN $3 = 'sunny' THEN current_sunny_tickets + $1
            ELSE current_sunny_tickets
          END,
          current_rainy_tickets = CASE 
            WHEN $3 = 'rainy' THEN current_rainy_tickets + $1
            ELSE current_rainy_tickets
          END,
          current_total_pool = current_total_pool + $2,
          updated_at = NOW()
        WHERE id = 1
      `, [quantity, totalCost.toString(), side]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        ticket: ticketResult.rows[0],
        message: `Successfully purchased ${quantity} ${side} ticket(s)`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error purchasing weather lotto tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purchase tickets' },
      { status: 500 }
    );
  }
}
