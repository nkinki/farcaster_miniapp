import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('Generating Airdrop summary post...');

    // Get airdrop statistics
    const totalSeasonsResult = await sql`
      SELECT COUNT(*) as count FROM seasons
    `;
    const totalSeasons = Number(totalSeasonsResult[0]?.count || 0);

    const currentSeasonResult = await sql`
      SELECT * FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
    `;
    const currentSeason = currentSeasonResult[0];

    const totalRewardsResult = await sql`
      SELECT COALESCE(SUM(total_rewards), 0) as total FROM seasons
    `;
    const totalRewards = Number(totalRewardsResult[0]?.total || 0);

    // Get user points statistics
    const totalUsersResult = await sql`
      SELECT COUNT(DISTINCT user_fid) as count FROM user_season_summary
    `;
    const totalUsers = Number(totalUsersResult[0]?.count || 0);

    const totalPointsResult = await sql`
      SELECT COALESCE(SUM(total_points), 0) as total FROM user_season_summary
    `;
    const totalPoints = Number(totalPointsResult[0]?.total || 0);

    // Get top point earners
    const topEarnersResult = await sql`
      SELECT 
        user_fid,
        total_points
      FROM user_season_summary 
      ORDER BY total_points DESC 
      LIMIT 5
    `;

    // Generate random emoji combinations for variety
    const emojiSets = [
      { airdrop: '🎁', points: '⭐', chess: '💎', daily: '📅', fire: '🔥', star: '✨' },
      { airdrop: '💰', points: '🎯', chess: '💵', daily: '⏰', fire: '⚡', star: '🌟' },
      { airdrop: '🎊', points: '🏆', chess: '💴', daily: '📆', fire: '🚀', star: '💫' },
      { airdrop: '🎈', points: '🎖️', chess: '💸', daily: '🗓️', fire: '🔥', star: '⭐' },
      { airdrop: '🎁', points: '🏅', chess: '💎', daily: '📅', fire: '⚡', star: '✨' }
    ];
    
    const randomEmoji = emojiSets[Math.floor(Math.random() * emojiSets.length)];

    // Generate random motivational messages
    const motivationalMessages = [
      "The airdrop season is here! 🌱",
      "Amazing rewards await! 📈", 
      "Don't miss out on free CHESS! 🚀",
      "Your daily check pays off! 🎯",
      "Holding CHESS is the key! ✨",
      "Points = Free money! 💎",
      "Start earning today! 🌟",
      "The more you hold, the more you earn! 🏆"
    ];
    
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    // Generate random compact layouts
    const layouts = [
      {
        header: `${randomEmoji.airdrop} AIRDROP SEASON ${randomEmoji.airdrop}`,
        box: `┌─────────────────────────────────┐\n│  Free CHESS Distribution  │\n└─────────────────────────────────┘`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomEmoji.fire} FREE CHESS ${randomEmoji.fire}`,
        box: `╔═════════════════════════════════╗\n║  Airdrop Campaign  ║\n╚═════════════════════════════════╝`,
        separator: '═══════════════════════════════════════════'
      },
      {
        header: `${randomEmoji.star} REWARDS ${randomEmoji.star}`,
        box: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  Point System  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomEmoji.airdrop} DISTRIBUTION ${randomEmoji.airdrop}`,
        box: `┌─────────────────────────────────┐\n│  Earn Points  │\n└─────────────────────────────────┘`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomEmoji.fire} CHESS DROPS ${randomEmoji.fire}`,
        box: `╭─────────────────────────────────╮\n│  Free Tokens  │\n╰─────────────────────────────────╯`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      }
    ];
    
    const randomLayout = layouts[Math.floor(Math.random() * layouts.length)];

    // Format top earners
    const topEarnersList = topEarnersResult.length > 0 
      ? topEarnersResult.map((earner, index) => 
          `${index + 1}. FID ${earner.user_fid} - ${earner.total_points || 0} points`
        ).join('\n')
      : 'No points earned yet';

    const airdropSummaryPost = `
${randomLayout.header}

${randomLayout.box}

${randomEmoji.airdrop} Total Seasons: ${totalSeasons}
${randomEmoji.points} Total Points: ${totalPoints.toLocaleString()}
${randomEmoji.star} Active Users: ${totalUsers.toLocaleString()}
${randomEmoji.chess} Total Rewards: ${(totalRewards / 1e18).toLocaleString()} CHESS

${currentSeason ? `
${randomEmoji.fire} Current Season: AppRank Airdrop Season 0
${randomEmoji.chess} Season Rewards: ${(currentSeason.total_rewards / 1e18).toLocaleString()} CHESS
` : ''}

🏆 TOP POINT EARNERS:
${topEarnersList}

${randomEmoji.fire} ${randomMessage}

${randomEmoji.points} 7 WAYS TO EARN POINTS:
${randomEmoji.daily} Daily Check - 1 point/day ✅
❤️ Like/Recast - 1 point/action ❤️
📤 Share/Quote - 1 point/action 📤
💬 Comments - 1 point/action 💬
🚗 Lambo Lottery - 1 point/ticket 🚗
☀️ Weather Lotto - 1 point/ticket ☀️

${randomEmoji.chess} CHESS HOLDINGS:
${randomEmoji.chess} 1M CHESS = 1 point 💰
${randomEmoji.fire} UNLIMITED points daily! 🔥

${randomEmoji.star} WHY HOLD CHESS?
${randomEmoji.chess} 1M CHESS = 1 point every day
${randomEmoji.fire} More CHESS = More points = More airdrop
${randomEmoji.star} Daily check = Free points
${randomEmoji.airdrop} Airdrops based on total points

${randomEmoji.daily} Start your daily check now!
${randomEmoji.chess} Hold CHESS for maximum points!

🎯 Play FarChess: https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess
📊 AppRank Platform: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank

${randomLayout.separator}
AppRank - Airdrop Platform
    `.trim();

    // Send email with airdrop summary
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `🎁 AppRank Airdrop Season 0 Summary - ${totalPoints.toLocaleString()} Points Earned`,
          text: airdropSummaryPost,
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Airdrop summary email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Error sending airdrop summary email:', emailError);
      // Don't fail the whole request if email fails
    }

    return NextResponse.json({
      success: true,
      airdropSummaryPost,
      stats: {
        totalSeasons,
        totalPoints,
        totalUsers,
        totalRewards: totalRewards / 1e18,
        currentSeason: currentSeason ? {
          name: currentSeason.name,
          rewards: currentSeason.total_rewards / 1e18
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error generating Airdrop summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate airdrop summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
