import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const promotionId = searchParams.get('id');

    if (!promotionId) {
      return NextResponse.json({ 
        error: 'Missing promotion id parameter' 
      }, { status: 400 });
    }

    console.log('🔍 Checking promotion:', promotionId);

    // Get promotion details
    const promotionResult = await pool.query(
      'SELECT id, username, action_type, status, remaining_budget, total_budget FROM promotions WHERE id = $1',
      [promotionId]
    );

    if (promotionResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Promotion not found' 
      }, { status: 404 });
    }

    const promotion = promotionResult.rows[0];

    // Check existing actions for this promotion
    const actionsResult = await pool.query(`
      SELECT user_fid, action_type, verification_method, created_at
      FROM like_recast_user_actions 
      WHERE promotion_id = $1
      ORDER BY created_at DESC
    `, [promotionId]);

    // Check completions
    const completionsResult = await pool.query(`
      SELECT user_fid, reward_amount, verification_method, claimed_at
      FROM like_recast_completions 
      WHERE promotion_id = $1
      ORDER BY claimed_at DESC
    `, [promotionId]);

    return NextResponse.json({
      promotion,
      existingActions: actionsResult.rows,
      completions: completionsResult.rows,
      actionCount: actionsResult.rows.length,
      completionCount: completionsResult.rows.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Check Promotion API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}