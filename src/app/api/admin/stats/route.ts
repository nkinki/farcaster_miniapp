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

    // FarChess statistics with default values
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

    // Lottery statistics with default values
    let lotteryStats = {
      totalRounds: 0,
      activeRounds: 0,
      completedRounds: 0,
      totalTicketsSold: 0,
      totalRevenue: 0,
      totalPrizesDistributed: 0,
      totalWinners: 0,
      currentJackpot: 0,
      avgTicketsPerRound: 0,
      mostPopularNumbers: [] as { number: number; count: number }[],
      topWinners: [] as { player_fid: number; total_winnings: number }[]
    };

    try {
      // Lottery round stats
      const totalRoundsResult = await sql`SELECT COUNT(*) as count FROM lottery_draws`;
      const activeRoundsResult = await sql`SELECT COUNT(*) as count FROM lottery_draws WHERE status = 'active'`;
      const completedRoundsResult = await sql`SELECT COUNT(*) as count FROM lottery_draws WHERE status = 'completed'`;

      // Ticket stats
      const totalTicketsResult = await sql`SELECT COUNT(*) as count FROM lottery_tickets`;
      const totalRevenueResult = await sql`SELECT COALESCE(SUM(purchase_price), 0) as total FROM lottery_tickets`;

      // Winner stats
      const totalWinnersResult = await sql`SELECT COUNT(*) as count FROM lottery_winnings`;
      const totalPrizesResult = await sql`SELECT COALESCE(SUM(amount_won), 0) as total FROM lottery_winnings`;

      // Current jackpot (from active round)
      const currentJackpotResult = await sql`SELECT COALESCE(jackpot, 0) as jackpot FROM lottery_draws WHERE status = 'active' ORDER BY draw_number DESC LIMIT 1`;

      // Average tickets per round
      const avgTicketsResult = await sql`
        SELECT COALESCE(AVG(ticket_count), 0) as avg_tickets 
        FROM (
          SELECT draw_id, COUNT(*) as ticket_count 
          FROM lottery_tickets 
          GROUP BY draw_id
        ) as round_tickets
      `;

      // Most popular numbers
      const popularNumbersResult = await sql`
        SELECT number, COUNT(*) as count 
        FROM lottery_tickets 
        GROUP BY number 
        ORDER BY count DESC 
        LIMIT 10
      `;

      // Top winners
      const topWinnersResult = await sql`
        SELECT player_fid, SUM(amount_won) as total_winnings 
        FROM lottery_winnings 
        GROUP BY player_fid 
        ORDER BY total_winnings DESC 
        LIMIT 5
      `;

      lotteryStats = {
        totalRounds: Number(totalRoundsResult[0]?.count || 0),
        activeRounds: Number(activeRoundsResult[0]?.count || 0),
        completedRounds: Number(completedRoundsResult[0]?.count || 0),
        totalTicketsSold: Number(totalTicketsResult[0]?.count || 0),
        totalRevenue: Number(totalRevenueResult[0]?.total || 0),
        totalPrizesDistributed: Number(totalPrizesResult[0]?.total || 0),
        totalWinners: Number(totalWinnersResult[0]?.count || 0),
        currentJackpot: Number(currentJackpotResult[0]?.jackpot || 0),
        avgTicketsPerRound: Number(avgTicketsResult[0]?.avg_tickets || 0),
        mostPopularNumbers: popularNumbersResult.map(row => ({
          number: row.number,
          count: Number(row.count)
        })),
        topWinners: topWinnersResult.map(row => ({
          player_fid: row.player_fid,
          total_winnings: Number(row.total_winnings)
        }))
      };
    } catch (e) {
      console.log('Lottery tables might not exist:', e);
    }

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
      // FarChess statistics
      farChess: farChessStats,
      // Lottery statistics
      lottery: lotteryStats,
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