import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('Generating Share & Earn summary post...');

    // Get Share & Earn statistics
    const totalPromotionsResult = await sql`
      SELECT COUNT(*) as count FROM promotions
    `;
    const totalPromotions = Number(totalPromotionsResult[0]?.count || 0);

    const activePromotionsResult = await sql`
      SELECT COUNT(*) as count FROM promotions WHERE status = 'active'
    `;
    const activePromotions = Number(activePromotionsResult[0]?.count || 0);

    const totalSharesResult = await sql`
      SELECT COUNT(*) as count FROM shares
    `;
    const totalShares = Number(totalSharesResult[0]?.count || 0);

    const totalRewardsResult = await sql`
      SELECT COALESCE(SUM(reward_amount), 0) as total FROM shares
    `;
    const totalRewards = Number(totalRewardsResult[0]?.total || 0);

    const totalUsersResult = await sql`
      SELECT COUNT(DISTINCT sharer_fid) as count FROM shares
    `;
    const totalUsers = Number(totalUsersResult[0]?.count || 0);

    const avgRewardResult = await sql`
      SELECT AVG(reward_amount) as avg FROM shares
    `;
    const avgReward = Number(avgRewardResult[0]?.avg || 0);

    // Get top sharers
    const topSharersResult = await sql`
      SELECT 
        sharer_fid,
        COUNT(*) as share_count,
        SUM(reward_amount) as total_earnings
      FROM shares 
      GROUP BY sharer_fid 
      ORDER BY share_count DESC 
      LIMIT 5
    `;

    // Get recent activity (last 7 days)
    const recentActivityResult = await sql`
      SELECT COUNT(*) as count FROM shares 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `;
    const recentShares = Number(recentActivityResult[0]?.count || 0);

    // Get total potential earnings (sum of all active promotion budgets)
    const totalPotentialResult = await sql`
      SELECT COALESCE(SUM(remaining_budget), 0) as total FROM promotions WHERE status = 'active'
    `;
    const totalPotentialEarnings = Number(totalPotentialResult[0]?.total || 0);

    // Generate random emoji combinations for variety
    const emojiSets = [
      { share: '📢', earn: '💰', users: '👥', stats: '📊', fire: '🔥', star: '⭐' },
      { share: '📣', earn: '💎', users: '🚀', stats: '📈', fire: '⚡', star: '🌟' },
      { share: '📤', earn: '💵', users: '👨‍👩‍👧‍👦', stats: '📋', fire: '🎯', star: '✨' },
      { share: '📡', earn: '💴', users: '🎪', stats: '📉', fire: '🚀', star: '💫' },
      { share: '📢', earn: '💸', users: '🎭', stats: '📊', fire: '🔥', star: '⭐' }
    ];
    
    const randomEmoji = emojiSets[Math.floor(Math.random() * emojiSets.length)];

    // Generate random motivational messages
    const motivationalMessages = [
      "The community is thriving! 🌱",
      "Amazing growth continues! 📈", 
      "Incredible engagement! 🚀",
      "Outstanding participation! 🎯",
      "Fantastic community spirit! ✨",
      "Remarkable progress! 💎",
      "Exceptional results! 🌟",
      "Phenomenal activity! 🎪"
    ];
    
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    // Generate random compact layouts
    const layouts = [
      {
        header: `${randomEmoji.stats} SHARE & EARN STATS ${randomEmoji.stats}`,
        box: `┌─────────────────────────────────┐\n│  Community Performance  │\n└─────────────────────────────────┘`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomEmoji.fire} COMMUNITY METRICS ${randomEmoji.fire}`,
        box: `╔═════════════════════════════════╗\n║  Share & Earn Results  ║\n╚═════════════════════════════════╝`,
        separator: '═══════════════════════════════════════════'
      },
      {
        header: `${randomEmoji.star} APP STATS ${randomEmoji.star}`,
        box: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  Community Growth  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomEmoji.fire} GROWTH REPORT ${randomEmoji.fire}`,
        box: `┌─────────────────────────────────┐\n│  Share & Earn  │\n└─────────────────────────────────┘`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomEmoji.stats} COMMUNITY ${randomEmoji.stats}`,
        box: `╭─────────────────────────────────╮\n│  Performance Update  │\n╰─────────────────────────────────╯`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      }
    ];
    
    const randomLayout = layouts[Math.floor(Math.random() * layouts.length)];

    // Format top sharers
    const topSharersList = topSharersResult.length > 0 
      ? topSharersResult.map((sharer, index) => 
          `${index + 1}. FID ${sharer.sharer_fid} - ${sharer.share_count} shares - ${(sharer.total_earnings / 1e18).toFixed(2)} CHESS`
        ).join('\n')
      : 'No shares yet';

    const summaryPost = `
${randomLayout.header}

${randomLayout.box}

${randomEmoji.share} Total Shares: ${totalShares.toLocaleString()}
${randomEmoji.earn} Total Rewards: ${(totalRewards / 1e18).toLocaleString()} CHESS
${randomEmoji.users} Active Users: ${totalUsers.toLocaleString()}
${randomEmoji.stats} Avg Reward: ${(avgReward / 1e18).toFixed(2)} CHESS

${randomEmoji.fire} Recent Activity (7 days): ${recentShares.toLocaleString()} shares
${randomEmoji.star} Active Promotions: ${activePromotions}/${totalPromotions}

🏆 TOP SHARERS:
${topSharersList}

${randomEmoji.fire} ${randomMessage}

💰 EARNING POTENTIAL:
${randomEmoji.earn} Average per share: ${(avgReward / 1e18).toFixed(2)} CHESS
${randomEmoji.star} Top earner: ${topSharersResult.length > 0 ? (topSharersResult[0].total_earnings / 1e18).toFixed(2) : '0'} CHESS
${randomEmoji.fire} Total distributed: ${(totalRewards / 1e18).toLocaleString()} CHESS

🎯 MAXIMUM EARNINGS:
${randomEmoji.earn} Total available: ${(totalPotentialEarnings / 1e18).toLocaleString()} CHESS
${randomEmoji.star} Active promotions: ${activePromotions} campaigns
${randomEmoji.fire} Potential per user: ${activePromotions > 0 ? ((totalPotentialEarnings / 1e18) / totalUsers).toFixed(2) : '0'} CHESS

${randomEmoji.share} HOW TO EARN:
${randomEmoji.earn} 1. Share content = ${(avgReward / 1e18).toFixed(2)} CHESS per share
${randomEmoji.users} 2. Hold 1M CHESS = 1 point daily
${randomEmoji.star} 3. Play games = bonus rewards
${randomEmoji.fire} 4. Participate in lotteries = win big!

${randomEmoji.share} Join now and start earning CHESS!
https://farc-nu.vercel.app/promote

${randomLayout.separator}
AppRank - Share & Earn Platform
    `.trim();

    return NextResponse.json({
      success: true,
      summaryPost,
      stats: {
        totalShares,
        totalRewards: totalRewards / 1e18,
        totalUsers,
        avgReward: avgReward / 1e18,
        recentShares,
        activePromotions,
        totalPromotions,
        totalPotentialEarnings: totalPotentialEarnings / 1e18
      }
    });

  } catch (error) {
    console.error('❌ Error generating Share & Earn summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
