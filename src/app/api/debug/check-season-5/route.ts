import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
    const client = await pool.connect();
    try {
        const result = await client.query(`
      SELECT id, name, status, total_rewards 
      FROM seasons 
      WHERE id = 5
    `);

        return NextResponse.json({
            success: true,
            season: result.rows[0]
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
