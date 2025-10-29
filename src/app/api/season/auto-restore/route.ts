import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(_request: NextRequest) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Find the most recently created season (regardless of status)
    const seasonRes = await client.query(
      `SELECT id, name, status, start_date, end_date
       FROM seasons
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (seasonRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'No season found' }, { status: 404 });
    }

    const season = seasonRes.rows[0];
    const seasonId = season.id as number;

    // 2) If season is not active, set to active
    if (season.status !== 'active') {
      await client.query(`UPDATE seasons SET status = 'active', updated_at = NOW() WHERE id = $1`, [seasonId]);
    }

    // 3) If end_date is in the past, extend by 30 days from now
    const now = new Date();
    const endDate = new Date(season.end_date);
    if (endDate.getTime() <= now.getTime()) {
      await client.query(
        `UPDATE seasons SET end_date = NOW() + INTERVAL '30 days', updated_at = NOW() WHERE id = $1`,
        [seasonId]
      );
    }

    // 4) Recalculate user_season_summary from user_daily_points for this season
    //    Aggregate per user and upsert into user_season_summary
    const usersRes = await client.query(
      `WITH user_stats AS (
         SELECT 
           udp.user_fid,
           COALESCE(SUM(CASE WHEN udp.daily_check THEN 1 ELSE 0 END), 0) AS daily_checks,
           COALESCE(SUM(udp.chess_holdings_points), 0) AS chess_points,
           COALESCE(SUM(udp.total_points), 0) AS total_points,
           MAX(udp.updated_at) AS last_activity
         FROM user_daily_points udp
         WHERE udp.season_id = $1
         GROUP BY udp.user_fid
       )
       SELECT * FROM user_stats`,
      [seasonId]
    );

    for (const row of usersRes.rows) {
      await client.query(
        `INSERT INTO user_season_summary (
           user_fid, season_id, total_points, daily_checks,
           total_likes, total_recasts, total_shares, total_comments,
           total_lambo_tickets, total_weather_tickets, total_chess_points,
           last_activity
         ) VALUES (
           $1, $2, $3, $4,
           0, 0, 0, 0,
           0, 0, $5,
           $6
         )
         ON CONFLICT (user_fid, season_id)
         DO UPDATE SET 
           total_points = EXCLUDED.total_points,
           daily_checks = EXCLUDED.daily_checks,
           total_chess_points = EXCLUDED.total_chess_points,
           last_activity = EXCLUDED.last_activity,
           updated_at = NOW()`,
        [
          row.user_fid,
          seasonId,
          Number(row.total_points) || 0,
          Number(row.daily_checks) || 0,
          Number(row.chess_points) || 0,
          row.last_activity || new Date().toISOString(),
        ]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({
      success: true,
      season: {
        id: seasonId,
      },
      usersUpdated: usersRes.rowCount,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}


