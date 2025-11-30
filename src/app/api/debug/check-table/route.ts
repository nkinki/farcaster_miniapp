import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
    const client = await pool.connect();
    try {
        // Check columns
        const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'season_participants'
    `);

        // Check data
        let data = [];
        if (columnsRes.rows.length > 0) {
            const dataRes = await client.query('SELECT * FROM season_participants LIMIT 10');
            data = dataRes.rows;
        }

        return NextResponse.json({
            exists: columnsRes.rows.length > 0,
            columns: columnsRes.rows,
            sampleData: data
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    } finally {
        client.release();
    }
}
