import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
    const client = await pool.connect();
    try {
        // Try to get top 10 from season_participants
        const result = await client.query(`
      SELECT * FROM season_participants 
      ORDER BY points DESC 
      LIMIT 10
    `);

        return NextResponse.json({
            success: true,
            top10: result.rows,
            count: result.rows.length
        });
    } catch (error: any) {
        // If table doesn't exist, return error with helpful info
        return NextResponse.json({
            success: false,
            error: error.message,
            hint: 'Table season_participants might not exist in this database'
        }, { status: 500 });
    } finally {
        client.release();
    }
}
