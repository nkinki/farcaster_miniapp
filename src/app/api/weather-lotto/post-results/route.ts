import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { round, winningSide, winners, totalPayout, treasuryAmount } = await request.json();

    // Engaging post variations in English
    const postVariations = [
      // Variation 1: Emoji heavy
      `🎰 WEATHER LOTTO RESULTS 🎰\n\nRound #${round.round_number} COMPLETED!\n\n🏆 WINNING SIDE: ${winningSide.toUpperCase()}\n💰 Total Payout: ${(totalPayout / 1e18).toFixed(2)} CHESS\n🏛️ Treasury: ${(treasuryAmount / 1e18).toFixed(2)} CHESS\n👥 Winners: ${winners.length} players\n\n🎉 Congratulations to all winners! 🎉\n\n#WeatherLotto #CHESS #Farcaster`,

      // Variation 2: Drama style
      `⚡ BREAKING: Weather Lotto Draw Complete! ⚡\n\n🌤️ Round #${round.round_number} has been decided!\n\n🏆 The winning side is: ${winningSide.toUpperCase()}\n\n💰 ${(totalPayout / 1e18).toFixed(2)} CHESS distributed to ${winners.length} lucky winners!\n🏛️ ${(treasuryAmount / 1e18).toFixed(2)} CHESS added to treasury\n\n🎊 Another successful draw in the books! 🎊\n\n#WeatherLotto #CHESS #Winners`,

      // Variation 3: News style
      `📰 WEATHER LOTTO DAILY REPORT 📰\n\nRound #${round.round_number} Results:\n\n🎯 Winning Side: ${winningSide.toUpperCase()}\n💸 Prize Pool: ${(totalPayout / 1e18).toFixed(2)} CHESS\n👑 Winners: ${winners.length} players\n🏦 Treasury: ${(treasuryAmount / 1e18).toFixed(2)} CHESS\n\n🌤️ Will tomorrow be sunny or rainy? Place your bets! 🌤️\n\n#WeatherLotto #DailyDraw #CHESS`,

      // Variation 4: Celebration style
      `🎉 WEATHER LOTTO CELEBRATION! 🎉\n\nRound #${round.round_number} is COMPLETE!\n\n🏆 ${winningSide.toUpperCase()} takes the win!\n\n💰 ${(totalPayout / 1e18).toFixed(2)} CHESS in prizes!\n👥 ${winners.length} happy winners!\n🏛️ ${(treasuryAmount / 1e18).toFixed(2)} CHESS to treasury\n\n🎊 Thank you for playing! 🎊\n\n#WeatherLotto #Winners #CHESS #Celebration`,

      // Variation 5: Stats focused
      `📊 WEATHER LOTTO STATS UPDATE 📊\n\nRound #${round.round_number} Final Results:\n\n🎲 Winning Side: ${winningSide.toUpperCase()}\n💎 Prize Distribution: ${(totalPayout / 1e18).toFixed(2)} CHESS\n👑 Winner Count: ${winners.length}\n🏛️ Treasury Addition: ${(treasuryAmount / 1e18).toFixed(2)} CHESS\n\n📈 Total Rounds: ${round.round_number}\n\n#WeatherLotto #Stats #CHESS #Data`,

      // Variation 6: Community focused
      `🌍 WEATHER LOTTO COMMUNITY UPDATE 🌍\n\nRound #${round.round_number} Results:\n\n🏆 ${winningSide.toUpperCase()} wins the day!\n\n💰 ${(totalPayout / 1e18).toFixed(2)} CHESS shared with ${winners.length} community members!\n🏛️ ${(treasuryAmount / 1e18).toFixed(2)} CHESS supports the treasury\n\n🤝 Thank you for being part of our community! 🤝\n\n#WeatherLotto #Community #CHESS #Together`,

      // Variation 7: Action oriented
      `⚡ WEATHER LOTTO ACTION COMPLETE! ⚡\n\nRound #${round.round_number} Draw Results:\n\n🎯 Winning Side: ${winningSide.toUpperCase()}\n\n💸 Prize Pool: ${(totalPayout / 1e18).toFixed(2)} CHESS\n👑 Winners: ${winners.length} players\n🏦 Treasury: ${(treasuryAmount / 1e18).toFixed(2)} CHESS\n\n🚀 Ready for the next round? 🚀\n\n#WeatherLotto #Action #CHESS #NextRound`,

      // Variation 8: Mystery style
      `🔮 WEATHER LOTTO MYSTERY SOLVED! 🔮\n\nRound #${round.round_number} Revealed:\n\n🏆 The winning side is... ${winningSide.toUpperCase()}!\n\n💰 ${(totalPayout / 1e18).toFixed(2)} CHESS distributed!\n👥 ${winners.length} players rewarded!\n🏛️ ${(treasuryAmount / 1e18).toFixed(2)} CHESS to treasury\n\n🎭 What will tomorrow bring? 🎭\n\n#WeatherLotto #Mystery #CHESS #Revealed`,

      // Variation 9: Achievement style
      `🏅 WEATHER LOTTO ACHIEVEMENT UNLOCKED! 🏅\n\nRound #${round.round_number} Complete!\n\n🎯 Winning Side: ${winningSide.toUpperCase()}\n\n💎 Prize Distribution: ${(totalPayout / 1e18).toFixed(2)} CHESS\n👑 Winner Count: ${winners.length}\n🏛️ Treasury: ${(treasuryAmount / 1e18).toFixed(2)} CHESS\n\n🎖️ Another successful draw achieved! 🎖️\n\n#WeatherLotto #Achievement #CHESS #Success`,

      // Variation 10: Future focused
      `🚀 WEATHER LOTTO FUTURE UPDATE! 🚀\n\nRound #${round.round_number} Results:\n\n🏆 ${winningSide.toUpperCase()} wins!\n\n💰 ${(totalPayout / 1e18).toFixed(2)} CHESS distributed to ${winners.length} winners!\n🏛️ ${(treasuryAmount / 1e18).toFixed(2)} CHESS to treasury\n\n🌟 The future of weather prediction is here! 🌟\n\n#WeatherLotto #Future #CHESS #Innovation`
    ];

    // Random variation selection
    const randomIndex = Math.floor(Math.random() * postVariations.length);
    const selectedPost = postVariations[randomIndex];

    // Send email notification
    const emailContent = `
🌤️ WEATHER LOTTO DRAW COMPLETED! 🌤️

Round #${round.round_number} Results:
- Winning Side: ${winningSide.toUpperCase()}
- Total Payout: ${(totalPayout / 1e18).toFixed(2)} CHESS
- Winners: ${winners.length} players
- Treasury: ${(treasuryAmount / 1e18).toFixed(2)} CHESS

Selected Farcaster Post (Variation ${randomIndex + 1}):
${selectedPost}

All Post Variations:
${postVariations.map((post, index) => `${index + 1}. ${post.split('\n')[0]}`).join('\n')}

Timestamp: ${new Date().toISOString()}
    `;

    // Send email
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/weather-lotto/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailContent,
          selectedPost,
          allVariations: postVariations,
          roundData: round
        })
      });

      if (emailResponse.ok) {
        console.log('✅ Email sent successfully');
      } else {
        console.log('⚠️ Email sending failed');
      }
    } catch (emailError) {
      console.log('⚠️ Email sending error (non-critical):', emailError);
    }

    // Farcaster posztolás
    try {
      console.log('📱 Posting to Farcaster...');
      const farcasterResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/farcaster/post-neynar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: selectedPost,
          embeds: [{
            url: 'https://farc-nu.vercel.app',
            title: 'Weather Lotto Results',
            description: `Round #${round.round_number} completed!`
          }]
        })
      });

      if (farcasterResponse.ok) {
        const farcasterResult = await farcasterResponse.json();
        console.log('✅ Posted to Farcaster successfully:', farcasterResult.castHash);
      } else {
        console.log('⚠️ Farcaster posting failed');
      }
    } catch (farcasterError) {
      console.log('⚠️ Farcaster posting error (non-critical):', farcasterError);
    }

    console.log('📧 Email content:', emailContent);
    console.log('📱 Selected Farcaster post:', selectedPost);

    return NextResponse.json({
      success: true,
      selectedPost,
      allVariations: postVariations,
      emailContent,
      message: 'Post variations generated and email sent successfully'
    });

  } catch (error) {
    console.error('Error generating post variations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate post variations' },
      { status: 500 }
    );
  }
}
