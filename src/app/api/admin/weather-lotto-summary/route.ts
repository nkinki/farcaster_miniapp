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
    console.log('Generating Weather Lotto summary post...');

    // Get Weather Lotto statistics
    const totalTicketsResult = await sql`
      SELECT COUNT(*) as count FROM weather_lotto_tickets
    `;
    const totalTickets = Number(totalTicketsResult[0]?.count || 0);

    const totalRoundsResult = await sql`
      SELECT COUNT(*) as count FROM weather_lotto_rounds
    `;
    const totalRounds = Number(totalRoundsResult[0]?.count || 0);

    const totalWinnersResult = await sql`
      SELECT COUNT(*) as count FROM weather_lotto_rounds WHERE winner_fid IS NOT NULL
    `;
    const totalWinners = Number(totalWinnersResult[0]?.count || 0);

    const totalPrizePoolResult = await sql`
      SELECT COALESCE(SUM(prize_pool), 0) as total FROM weather_lotto_rounds
    `;
    const totalPrizePool = Number(totalPrizePoolResult[0]?.total || 0);

    const totalDistributedResult = await sql`
      SELECT COALESCE(SUM(prize_pool), 0) as total FROM weather_lotto_rounds WHERE winner_fid IS NOT NULL
    `;
    const totalDistributed = Number(totalDistributedResult[0]?.total || 0);

    // Get current round
    const currentRoundResult = await sql`
      SELECT * FROM weather_lotto_rounds 
      WHERE status = 'active' 
      ORDER BY created_at DESC LIMIT 1
    `;
    const currentRound = currentRoundResult[0];

    // Get recent rounds
    const recentRoundsResult = await sql`
      SELECT 
        round_number,
        weather_prediction,
        actual_weather,
        prize_pool,
        winner_fid,
        created_at
      FROM weather_lotto_rounds 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    // Get top players
    const topPlayersResult = await sql`
      SELECT 
        player_fid,
        COUNT(*) as tickets_purchased,
        COUNT(CASE WHEN wr.winner_fid IS NOT NULL THEN 1 END) as wins
      FROM weather_lotto_tickets wlt
      LEFT JOIN weather_lotto_rounds wr ON wlt.round_id = wr.id AND wr.winner_fid = wlt.player_fid
      GROUP BY player_fid
      ORDER BY tickets_purchased DESC
      LIMIT 5
    `;

    // Use simple emoji icons that display properly everywhere
    const iconSets = [
      { weather: '☀️', rain: '🌧️', sun: '☀️', cloud: '☁️', storm: '⛈️', ticket: '🎫', prize: '🏆', player: '👤' },
      { weather: '🌤️', rain: '🌦️', sun: '☀️', cloud: '☁️', storm: '⛈️', ticket: '🎫', prize: '🏆', player: '👤' },
      { weather: '🌦️', rain: '🌧️', sun: '☀️', cloud: '☁️', storm: '⛈️', ticket: '🎫', prize: '🏆', player: '👤' },
      { weather: '🌧️', rain: '🌧️', sun: '☀️', cloud: '☁️', storm: '⛈️', ticket: '🎫', prize: '🏆', player: '👤' },
      { weather: '⛈️', rain: '🌧️', sun: '☀️', cloud: '☁️', storm: '⛈️', ticket: '🎫', prize: '🏆', player: '👤' }
    ];
    
    const randomIcon = iconSets[Math.floor(Math.random() * iconSets.length)];

    // Generate random motivational messages
    const motivationalMessages = [
      "Predict the weather, win CHESS!",
      "Sunny or rainy? Your call!",
      "Weather prediction = CHESS rewards!",
      "Rain or shine, we pay!",
      "Forecast your fortune!",
      "Weather wisdom wins!",
      "Sunny days, big paydays!",
      "Rain brings rewards!"
    ];
    
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    // Generate random compact layouts
    const layouts = [
      {
        header: `${randomIcon.weather} WEATHER LOTTO ${randomIcon.weather}`,
        box: `┌─────────────────────────────────┐\n│  Predict & Win  │\n└─────────────────────────────────┘`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomIcon.sun} SUNNY/RAINY ${randomIcon.rain}`,
        box: `╔═════════════════════════════════╗\n║  Weather Prediction  ║\n╚═════════════════════════════════╝`,
        separator: '═══════════════════════════════════════════'
      },
      {
        header: `${randomIcon.ticket} LOTTERY ${randomIcon.ticket}`,
        box: `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  Weather Game  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomIcon.prize} PRIZES ${randomIcon.prize}`,
        box: `┌─────────────────────────────────┐\n│  Win CHESS  │\n└─────────────────────────────────┘`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      },
      {
        header: `${randomIcon.storm} FORECAST ${randomIcon.storm}`,
        box: `╭─────────────────────────────────╮\n│  Weather Lotto  │\n╰─────────────────────────────────╯`,
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      }
    ];
    
    const randomLayout = layouts[Math.floor(Math.random() * layouts.length)];

    // Format top players
    const topPlayersList = topPlayersResult.length > 0 
      ? topPlayersResult.map((player, index) => 
          `${index + 1}. FID ${player.player_fid} - ${player.tickets_purchased} tickets - ${player.wins} wins`
        ).join('\n')
      : 'No players yet';

    // Format recent rounds
    const recentRoundsList = recentRoundsResult.length > 0 
      ? recentRoundsResult.map((round, index) => 
          `Round ${round.round_number}: ${round.weather_prediction} → ${round.actual_weather || 'TBD'} - ${(round.prize_pool / 1e18).toLocaleString()} CHESS`
        ).join('\n')
      : 'No rounds yet';

    const weatherLottoSummaryPost = `
${randomLayout.header}

${randomLayout.box}

${randomIcon.ticket} Total Tickets: ${totalTickets.toLocaleString()}
${randomIcon.prize} Total Rounds: ${totalRounds.toLocaleString()}
${randomIcon.player} Total Winners: ${totalWinners.toLocaleString()}
${randomIcon.prize} Total Prize Pool: ${(totalPrizePool / 1e18).toLocaleString()} CHESS
${randomIcon.prize} Total Distributed: ${(totalDistributed / 1e18).toLocaleString()} CHESS

${currentRound ? `
${randomIcon.weather} Current Round: #${currentRound.round_number}
${randomIcon.sun} Prediction: ${currentRound.weather_prediction}
${randomIcon.prize} Prize Pool: ${(currentRound.prize_pool / 1e18).toLocaleString()} CHESS
` : ''}

${randomIcon.player} TOP PLAYERS:
${topPlayersList}

${randomIcon.weather} RECENT ROUNDS:
${recentRoundsList}

${randomIcon.weather} ${randomMessage}

${randomIcon.ticket} HOW TO PLAY:
${randomIcon.sun} 1. Predict: Sunny or Rainy
${randomIcon.ticket} 2. Buy tickets: 10,000 CHESS each
${randomIcon.weather} 3. Wait for weather result
${randomIcon.prize} 4. Win if you're right!

${randomIcon.sun} WEATHER PREDICTION:
${randomIcon.sun} Sunny = Clear skies, no rain
${randomIcon.rain} Rainy = Any precipitation
${randomIcon.weather} Based on real weather data
${randomIcon.prize} Winners split the prize pool!

${randomIcon.ticket} TICKET PRICES:
${randomIcon.ticket} 10,000 CHESS per ticket
${randomIcon.prize} No limit on tickets per round
${randomIcon.weather} Buy multiple for better odds!

${randomIcon.prize} PRIZE DISTRIBUTION:
${randomIcon.prize} All winners split the prize pool equally
${randomIcon.weather} More winners = smaller individual prizes
${randomIcon.ticket} No winners = prize rolls over to next round

${randomIcon.weather} Start predicting now!
${randomIcon.ticket} Buy your tickets today!

🎯 Play FarChess: https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess
📊 AppRank Platform: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank

${randomLayout.separator}
AppRank - Weather Lotto Platform
    `.trim();

    // Send email with weather lotto summary
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `🌤️ Weather Lotto Summary - ${totalTickets.toLocaleString()} Tickets Sold`,
          text: weatherLottoSummaryPost,
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Weather Lotto summary email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Error sending weather lotto summary email:', emailError);
      // Don't fail the whole request if email fails
    }

    return NextResponse.json({
      success: true,
      weatherLottoSummaryPost,
      stats: {
        totalTickets,
        totalRounds,
        totalWinners,
        totalPrizePool: totalPrizePool / 1e18,
        totalDistributed: totalDistributed / 1e18,
        currentRound: currentRound ? {
          round_number: currentRound.round_number,
          weather_prediction: currentRound.weather_prediction,
          prize_pool: currentRound.prize_pool / 1e18
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error generating Weather Lotto summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Weather Lotto summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
