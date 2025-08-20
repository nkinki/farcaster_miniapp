import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
  try {
    // Get total promotions
    const [totalPromotions] = await sql`
      SELECT COUNT(*) as count FROM promotions
    `;

    // Get active promotions
    const [activePromotions] = await sql`
      SELECT COUNT(*) as count FROM promotions WHERE status = 'active'
    `;

    // Get total shares
    const [totalShares] = await sql`
      SELECT COUNT(*) as count FROM shares
    `;

    // Get total rewards distributed
    const [totalRewards] = await sql`
      SELECT COALESCE(SUM(reward_amount), 0) as total FROM shares
    `;

    // Get total unique users
    const [totalUsers] = await sql`
      SELECT COUNT(DISTINCT sharer_fid) as count FROM shares
    `;

    // Get pending verifications
    const [pendingVerifications] = await sql`
      SELECT COUNT(*) as count FROM verifications WHERE status = 'pending'
    `;

    // Get completed verifications today
    const [todayVerifications] = await sql`
      SELECT COUNT(*) as count FROM verifications 
      WHERE status = 'completed' 
      AND DATE(created_at) = CURRENT_DATE
    `;

    // Get total budget allocated
    const [totalBudget] = await sql`
      SELECT COALESCE(SUM(total_budget), 0) as total FROM promotions
    `;

    // Get remaining budget
    const [remainingBudget] = await sql`
      SELECT COALESCE(SUM(remaining_budget), 0) as total FROM promotions WHERE status = 'active'
    `;

    // Get average reward per share
    const [avgReward] = await sql`
      SELECT COALESCE(AVG(reward_per_share), 0) as avg FROM promotions WHERE status = 'active'
    `;

    return NextResponse.json({
      totalPromotions: Number(totalPromotions.count),
      activePromotions: Number(activePromotions.count),
      totalShares: Number(totalShares.count),
      totalRewards: Number(totalRewards.total),
      totalUsers: Number(totalUsers.count),
      pendingVerifications: Number(pendingVerifications.count),
      todayVerifications: Number(todayVerifications.count),
      totalBudget: Number(totalBudget.total),
      remainingBudget: Number(remainingBudget.total),
      avgReward: Number(avgReward.avg).toFixed(2),
    });

  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch admin stats', 
      details: error.message 
    }, { status: 500 });
  }
}