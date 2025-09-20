import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { player_fid, round_id } = await request.json();

    if (!player_fid || !round_id) {
      return NextResponse.json(
        { success: false, error: 'Player FID and round ID are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get pending claims for this player and round
      const claimsResult = await client.query(`
        SELECT 
          c.*,
          r.round_number,
          r.winning_side
        FROM weather_lotto_claims c
        JOIN weather_lotto_rounds r ON c.round_id = r.id
        WHERE c.player_fid = $1 AND c.round_id = $2 AND c.status = 'pending'
      `, [player_fid, round_id]);

      if (claimsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'No pending claims found for this player and round' },
          { status: 400 }
        );
      }

      const claim = claimsResult.rows[0];

      // Verify the round is completed
      if (claim.round_status !== 'completed') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Round is not completed yet' },
          { status: 400 }
        );
      }

      // Update claim status to paid (in real implementation, this would be after successful blockchain transaction)
      await client.query(`
        UPDATE weather_lotto_claims 
        SET 
          status = 'paid',
          paid_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [claim.id]);

      // Update corresponding tickets as claimed
      await client.query(`
        UPDATE weather_lotto_tickets 
        SET 
          is_claimed = TRUE,
          claimed_at = NOW(),
          updated_at = NOW()
        WHERE round_id = $1 AND player_fid = $2 AND side = $3
      `, [round_id, player_fid, claim.winning_side]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        claim: {
          id: claim.id,
          round_number: claim.round_number,
          winning_side: claim.winning_side,
          total_tickets: claim.total_tickets,
          total_payout: BigInt(claim.total_payout),
          status: 'paid'
        },
        message: `Successfully claimed ${claim.total_payout} CHESS for ${claim.total_tickets} winning tickets`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error claiming weather lotto winnings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to claim winnings' },
      { status: 500 }
    );
  }
}
