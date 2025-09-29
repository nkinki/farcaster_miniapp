import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json({ 
        success: false, 
        error: 'User FID is required' 
      }, { status: 400 });
    }

    // Get user season summary
    const summaryResult = await client.query(`
      SELECT * FROM user_season_summary 
      WHERE user_fid = $1 AND season_id = 1
    `, [fid]);

    if (summaryResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        points: {
          total_points: 0,
          daily_checks: 0,
          total_likes: 0,
          total_recasts: 0,
          total_quotes: 0,
          total_shares: 0,
          total_comments: 0,
          total_lambo_tickets: 0,
          total_weather_tickets: 0,
          total_chess_points: 0,
          last_activity: null
        }
      });
    }

    const points = summaryResult.rows[0];

    return NextResponse.json({
      success: true,
      points: {
        total_points: points.total_points || 0,
        daily_checks: points.daily_checks || 0,
        total_likes: points.total_likes || 0,
        total_recasts: points.total_recasts || 0,
        total_quotes: points.total_quotes || 0,
        total_shares: points.total_shares || 0,
        total_comments: points.total_comments || 0,
        total_lambo_tickets: points.total_lambo_tickets || 0,
        total_weather_tickets: points.total_weather_tickets || 0,
        total_chess_points: points.total_chess_points || 0,
        last_activity: points.last_activity
      }
    });

  } catch (error) {
    console.error('Error fetching user points:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user points' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}
