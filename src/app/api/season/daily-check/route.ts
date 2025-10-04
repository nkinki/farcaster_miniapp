import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { user_fid } = await request.json();

    if (!user_fid) {
      return NextResponse.json({ 
        success: false, 
        error: 'User FID is required' 
      }, { status: 400 });
    }

    // Check if user already checked today
    const today = new Date().toISOString().split('T')[0];
    const existingCheck = await client.query(`
      SELECT id, daily_check FROM user_daily_points 
      WHERE user_fid = $1 AND date = $2
    `, [user_fid, today]);

    if (existingCheck.rows.length > 0 && existingCheck.rows[0].daily_check) {
      return NextResponse.json({ 
        success: false, 
        error: 'Already checked today' 
      }, { status: 400 });
    }

    // Get current active season ID
    const seasonResult = await client.query(`
      SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
    `);
    
    if (seasonResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active season found' 
      }, { status: 400 });
    }
    
    const seasonId = seasonResult.rows[0].id;

    await client.query('BEGIN');

    // Get user's wallet address from database
    const userResult = await client.query(`
      SELECT wallet_address FROM users WHERE fid = $1
    `, [user_fid]);
    
    let chessPoints = 0;
    if (userResult.rows.length > 0 && userResult.rows[0].wallet_address) {
      try {
        // Create Viem client for Base mainnet
        const client = createPublicClient({
          chain: base,
          transport: http()
        });
        
        // CHESS token contract address (Base mainnet)
        const CHESS_TOKEN_ADDRESS = '0x7c6b91D9Be155A6Db01f749817dD64eF24ebc1b2';
        
        // Get CHESS balance
        const balance = await client.readContract({
          address: CHESS_TOKEN_ADDRESS,
          abi: [
            {
              "inputs": [{"name": "account", "type": "address"}],
              "name": "balanceOf",
              "outputs": [{"name": "", "type": "uint256"}],
              "stateMutability": "view",
              "type": "function"
            },
            {
              "inputs": [],
              "name": "decimals",
              "outputs": [{"name": "", "type": "uint8"}],
              "stateMutability": "view",
              "type": "function"
            }
          ],
          functionName: 'balanceOf',
          args: [userResult.rows[0].wallet_address]
        });
        
        // Get decimals
        const decimals = await client.readContract({
          address: CHESS_TOKEN_ADDRESS,
          abi: [
            {
              "inputs": [],
              "name": "decimals",
              "outputs": [{"name": "", "type": "uint8"}],
              "stateMutability": "view",
              "type": "function"
            }
          ],
          functionName: 'decimals'
        });
        
        // Calculate points: 1M CHESS = 1 point
        const balanceFormatted = Number(balance) / Math.pow(10, Number(decimals));
        chessPoints = Math.floor(balanceFormatted / 1000000); // 1M CHESS = 1 point
        
      } catch (error) {
        console.warn('Failed to fetch CHESS balance:', error);
        chessPoints = 0;
      }
    }

    const totalPoints = 1 + chessPoints; // Daily check + CHESS points

    if (existingCheck.rows.length > 0) {
      // Update existing record
      await client.query(`
        UPDATE user_daily_points 
        SET 
          daily_check = true,
          chess_holdings_points = $1,
          total_points = total_points + $2,
          updated_at = NOW()
        WHERE user_fid = $3 AND date = $4
      `, [chessPoints, totalPoints, user_fid, today]);
    } else {
      // Create new record
      await client.query(`
        INSERT INTO user_daily_points (
          user_fid, season_id, date, daily_check, 
          chess_holdings_points, total_points
        ) VALUES ($1, $2, $3, true, $4, $5)
      `, [user_fid, seasonId, today, chessPoints, totalPoints]);
    }

    // Add transaction record
    await client.query(`
      INSERT INTO point_transactions (
        user_fid, season_id, action_type, points_earned, metadata
      ) VALUES ($1, $2, 'daily_check', $3, $4)
    `, [user_fid, seasonId, totalPoints, JSON.stringify({ 
      timestamp: new Date().toISOString()
    })]);

    // Update user season summary
    await client.query(`
      INSERT INTO user_season_summary (
        user_fid, season_id, total_points, daily_checks, 
        total_chess_points, last_activity
      ) VALUES ($1, $2, $3, 1, $4, NOW())
      ON CONFLICT (user_fid, season_id) 
      DO UPDATE SET 
        total_points = user_season_summary.total_points + $3,
        daily_checks = user_season_summary.daily_checks + 1,
        total_chess_points = user_season_summary.total_chess_points + $4,
        last_activity = NOW(),
        updated_at = NOW()
    `, [user_fid, seasonId, totalPoints, chessPoints]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      points_earned: totalPoints,
      chess_points: chessPoints,
      message: `Daily check completed! Earned ${totalPoints} points (${chessPoints} from CHESS holdings).`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Daily check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Daily check failed' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}
