import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: NextRequest) {
  try {
    const { action, playerFid, playerAddress, side, quantity } = await request.json();
    
    console.log(`🧪 Testing Weather Lotto offline: ${action}`, { playerFid, playerAddress, side, quantity });
    
    if (action === 'buy_tickets') {
      // Validate required fields
      if (!playerFid || !playerAddress || !side || !quantity) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing required fields: playerFid, playerAddress, side, quantity' 
        }, { status: 400 });
      }
      // Simulate buying tickets without blockchain
      const client = await pool.connect();
      
      try {
        // Get current active round
        let { rows: currentRound } = await client.query(
          'SELECT * FROM weather_lotto_rounds WHERE status = $1 ORDER BY round_number DESC LIMIT 1',
          ['active']
        );
        
        if (currentRound.length === 0) {
          // Create new round if none exists
          console.log('📝 No active round found, creating new one...');
          const newRoundResult = await client.query(`
            INSERT INTO weather_lotto_rounds (
              round_number, 
              start_time, 
              end_time, 
              status,
              house_base,
              total_pool
            ) VALUES (
              COALESCE((SELECT MAX(round_number) FROM weather_lotto_rounds), 0) + 1,
              NOW(),
              NOW() + INTERVAL '1 day',
              'active',
              200000000000000000000000,
              200000000000000000000000
            )
            RETURNING *
          `);
          
          currentRound = newRoundResult.rows;
          console.log('✅ New round created:', currentRound[0].round_number);
        }
        
        const round = currentRound[0];
        const ticketPrice = 100000; // 100k CHESS per ticket
        const totalCost = BigInt(ticketPrice * quantity * 1e18); // Convert to wei
        
        // Insert ticket
        const { rows: newTicket } = await client.query(`
          INSERT INTO weather_lotto_tickets (
            round_id, player_fid, player_address, side, quantity, total_cost
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [round.id, playerFid, playerAddress, side, quantity, totalCost.toString()]);
        
        // Update round statistics
        if (side === 'sunny') {
          await client.query(
            'UPDATE weather_lotto_rounds SET sunny_tickets = sunny_tickets + $1, total_tickets = total_tickets + $1, total_pool = total_pool + $2 WHERE id = $3',
            [quantity, totalCost.toString(), round.id]
          );
        } else {
          await client.query(
            'UPDATE weather_lotto_rounds SET rainy_tickets = rainy_tickets + $1, total_tickets = total_tickets + $1, total_pool = total_pool + $2 WHERE id = $3',
            [quantity, totalCost.toString(), round.id]
          );
        }
        
        // Update global stats
        await client.query(`
          UPDATE weather_lotto_stats 
          SET 
            total_tickets_sold = total_tickets_sold + $1,
            total_volume = total_volume + $2,
            current_sunny_tickets = (SELECT COALESCE(SUM(quantity), 0) FROM weather_lotto_tickets WHERE side = 'sunny' AND round_id = $3),
            current_rainy_tickets = (SELECT COALESCE(SUM(quantity), 0) FROM weather_lotto_tickets WHERE side = 'rainy' AND round_id = $3),
            current_total_pool = (SELECT total_pool FROM weather_lotto_rounds WHERE id = $3)
          WHERE id = 1
        `, [quantity, totalCost.toString(), round.id]);
        
        client.release();
        
        return NextResponse.json({ 
          success: true, 
          message: 'Tickets purchased successfully (offline test)',
          ticket: newTicket[0],
          round: {
            id: round.id,
            round_number: round.round_number,
            sunny_tickets: side === 'sunny' ? round.sunny_tickets + quantity : round.sunny_tickets,
            rainy_tickets: side === 'rainy' ? round.rainy_tickets + quantity : round.rainy_tickets,
            total_pool: (BigInt(round.total_pool) + totalCost).toString()
          }
        });
        
      } catch (error: any) {
        client.release();
        throw error;
      }
    }
    
    if (action === 'get_current_round') {
      const client = await pool.connect();
      
      try {
        const { rows: currentRound } = await client.query(`
          SELECT 
            r.*,
            s.current_sunny_tickets,
            s.current_rainy_tickets,
            s.current_total_pool
          FROM weather_lotto_rounds r
          LEFT JOIN weather_lotto_stats s ON s.id = 1
          WHERE r.status = 'active'
          ORDER BY r.round_number DESC
          LIMIT 1
        `);
        
        client.release();
        
        if (currentRound.length === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'No active round found' 
          }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          round: currentRound[0]
        });
        
      } catch (error: any) {
        client.release();
        throw error;
      }
    }
    
    if (action === 'get_user_tickets') {
      const client = await pool.connect();
      
      try {
        const { rows: userTickets } = await client.query(`
          SELECT t.*, r.round_number, r.status as round_status
          FROM weather_lotto_tickets t
          JOIN weather_lotto_rounds r ON t.round_id = r.id
          WHERE t.player_fid = $1
          ORDER BY t.created_at DESC
        `, [playerFid]);
        
        client.release();
        
        return NextResponse.json({ 
          success: true, 
          tickets: userTickets
        });
        
      } catch (error: any) {
        client.release();
        throw error;
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('❌ Weather Lotto offline test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
