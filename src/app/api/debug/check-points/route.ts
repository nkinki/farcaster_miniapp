import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
    const client = await pool.connect();
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Check Daily Points for today
        const dailyPoints = await client.query(`
      SELECT COUNT(*) as count, SUM(total_points) as total_points_today
      FROM user_daily_points 
      WHERE date::text LIKE $1 AND season_id = 4
    `, [`${today}%`]);

        // 2. Check recent entries
        const recent = await client.query(`
      SELECT user_fid, total_points, created_at 
      FROM user_daily_points 
      WHERE season_id = 4 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

        // 3. Check Season Summary
        const summary = await client.query(`
      SELECT COUNT(*) as total_participants, SUM(total_points) as season_total_points
      FROM user_season_summary 
      WHERE season_id = 4
    `);

        return NextResponse.json({
            success: true,
            today: {
                date: today,
                active_users: dailyPoints.rows[0].count,
                points_collected: dailyPoints.rows[0].total_points_today
            },
            recent_activity: recent.rows,
            season_summary: summary.rows[0]
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
