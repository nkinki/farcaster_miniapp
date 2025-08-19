import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fid: string }> }
) {
  try {
    const params = await context.params;
    const fid = parseInt(params.fid);
    
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      // Get completed like_recast actions for this user
      const { rows } = await client.query(`
        SELECT DISTINCT promotion_id
        FROM like_recast_completions
        WHERE user_fid = $1
      `, [fid]);

      return NextResponse.json({
        completedActions: rows,
        count: rows.length
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Failed to fetch completed actions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch completed actions',
      details: error.message 
    }, { status: 500 });
  }
}