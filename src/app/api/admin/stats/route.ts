import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching admin stats...');

    // Get total promotions
    const totalPromotionsResult = await sql`
      SELECT COUNT(*) as count FROM promotions
    `;
    const totalPromotions = totalPromotionsResult[0] || { count: 0 };

    // Get active promotions
    const activePromotionsResult = await sql`
      SELECT COUNT(*) as count FROM promotions WHERE status = 'active'
    `;
    const activePromotions = activePromotionsResult[0] || { count: 0 };

    // Get total shares
    const totalSharesResult = await sql`
      SELECT COUNT(*) as count FROM shares
    `;
    const totalShares = totalSharesResult[0] || { count: 0 };

    // Get total rewards distributed
    const totalRewardsResult = await sql`
      SELECT COALESCE(SUM(reward_amount), 0) as total FROM shares
    `;
    const totalRewards = totalRewardsResult[0] || { total: 0 };

    // Get total unique users
    const totalUsersResult = await sql`
      SELECT COUNT(DISTINCT sharer_fid) as count FROM shares
    `;
    const totalUsers = totalUsersResult[0] || { count: 0 };

    // Get pending verifications (with fallback if table doesn't exist)
    let pendingVerifications: any = { count: 0 };
    try {
      const pendingVerificationsResult = await sql`
        SELECT COUNT(*) as count FROM verifications WHERE status = 'pending'
      `;
      pendingVerifications = pendingVerificationsResult[0] || { count: 0 };
    } catch (e) {
      console.log('Verifications table might not exist:', e);
    }

    // Get completed verifications today (with fallback)
    let todayVerifications: any = { count: 0 };
    try {
      const todayVerificationsResult = await sql`
        SELECT COUNT(*) as count FROM verifications 
        WHERE status = 'completed' 
        AND DATE(created_at) = CURRENT_DATE
      `;
      todayVerifications = todayVerificationsResult[0] || { count: 0 };
    } catch (e) {
      console.log('Verifications table might not exist:', e);
    }

    // Get total budget allocated
    const totalBudgetResult = await sql`
      SELECT COALESCE(SUM(total_budget), 0) as total FROM promotions
    `;
    const totalBudget = totalBudgetResult[0] || { total: 0 };

    // Get remaining budget
    const remainingBudgetResult = await sql`
      SELECT COALESCE(SUM(remaining_budget), 0) as total FROM promotions WHERE status = 'active'
    `;
    const remainingBudget = remainingBudgetResult[0] || { total: 0 };

    // Get average reward per share
    const avgRewardResult = await sql`
      SELECT COALESCE(AVG(reward_per_share), 0) as avg FROM promotions WHERE status = 'active'
    `;
    const avgReward = avgRewardResult[0] || { avg: 0 };

    // FarChess statisztikák alapértelmezett értékekkel
    const farChessStats = {
      totalGames: 0,
      activeGames: 0,
      totalPlayers: 0,
      totalMoves: 0,
      completedGames: 0,
      totalUsers: 0,
      totalGamesPlayed: 0,
      totalGamesWon: 0
    };

    const stats = {
      totalPromotions: Number(totalPromotions.count) || 0,
      activePromotions: Number(activePromotions.count) || 0,
      totalShares: Number(totalShares.count) || 0,
      totalRewards: Number(totalRewards.total) || 0,
      totalUsers: Number(totalUsers.count) || 0,
      pendingVerifications: Number(pendingVerifications.count) || 0,
      todayVerifications: Number(todayVerifications.count) || 0,
      totalBudget: Number(totalBudget.total) || 0,
      remainingBudget: Number(remainingBudget.total) || 0,
      avgReward: Number(avgReward.avg).toFixed(2) || '0.00',
      // FarChess statisztikák
      farChess: farChessStats,
    };

    console.log('Admin stats result:', stats);
    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch admin stats', 
      details: error.message 
    }, { status: 500 });
  }
}