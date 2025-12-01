import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
    const client = await pool.connect();
    try {
        const { action, seasonId } = await request.json();

        if (action === 'activate_season_4') {
            await client.query(`
        UPDATE seasons 
        SET status = 'active', end_date = '2025-12-31' 
        WHERE id = 4
      `);
            return NextResponse.json({ success: true, message: 'Season 4 activated' });
        }

        if (action === 'delete_season_2') {
            // Be careful with delete, maybe just check it first
            const check = await client.query('SELECT * FROM seasons WHERE id = 2');
            if (check.rows.length > 0) {
                // If it's the "Winter Championship" with 15M, we might want to investigate or delete.
                // For now, let's just return info.
                return NextResponse.json({ success: true, season: check.rows[0], message: 'Season 2 found' });
            }
        }

        // Default: list seasons
        const seasons = await client.query('SELECT * FROM seasons ORDER BY id');
        return NextResponse.json({ success: true, seasons: seasons.rows });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
