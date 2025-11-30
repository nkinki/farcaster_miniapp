import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
    const client = await pool.connect();
    try {
        // Get table schema
        const schema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'season_participants'
      ORDER BY ordinal_position
    `);

        // Get sample data
        const sample = await client.query(`
      SELECT * FROM season_participants LIMIT 5
    `);

        return NextResponse.json({
            success: true,
            columns: schema.rows,
            sampleData: sample.rows
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
