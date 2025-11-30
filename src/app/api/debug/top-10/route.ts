import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
    const client = await pool.connect();
    try {
        // Get top 10 from season_participants (season_id = 1)
        const result = await client.query(`
      SELECT 
        farcaster_fid,
        farcaster_username,
        total_points,
        games_played,
        games_won,
        wallet_address
      FROM season_participants 
      WHERE season_id = 1
      ORDER BY total_points DESC 
      LIMIT 10
    `);

        return NextResponse.json({
            success: true,
            top10: result.rows,
            count: result.rows.length
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    } finally {
        client.release();
    }
}
