import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
    const client = await pool.connect();
    try {
        const fid = 260663;

        // 1. Check user_daily_points (active season)
        const dailyPoints = await client.query(`
      SELECT * FROM user_daily_points WHERE user_fid = $1 ORDER BY date DESC LIMIT 5
    `, [fid]);

        // 2. Check airdrop_claims
        const claims = await client.query(`
      SELECT * FROM airdrop_claims WHERE user_fid = $1
    `, [fid]);

        // 3. Check shares/quotes
        const shares = await client.query(`
      SELECT count(*) as total_shares FROM shares WHERE sharer_fid = $1
    `, [fid]);

        // 4. Check like/recast actions
        const actions = await client.query(`
      SELECT count(*) as total_actions FROM like_recast_actions WHERE user_fid = $1
    `, [fid]);

        return NextResponse.json({
            success: true,
            fid,
            dailyPoints: dailyPoints.rows,
            claims: claims.rows,
            activity: {
                shares: shares.rows[0].total_shares,
                actions: actions.rows[0].total_actions
            }
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
