import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { round, hasWinner, winner, winningNumber, totalTickets, newRound } = await request.json();
    
    // Wei to CHESS conversion constant
    const WEI_TO_CHESS = 1000000000000000000;

    // Helper function to format CHESS amounts
    const formatCHESS = (amount: string | number) => {
      return (parseInt(amount.toString()) / WEI_TO_CHESS).toFixed(2);
    };

    // Figyelemfelkeltő post variációk Lambo Lottery-hoz
    const postVariations = [
      // Variáció 1: Jackpot style
      `🎰 LAMBO LOTTERY RESULTS 🎰\n\nRound #${round.draw_number} COMPLETED!\n\n🎲 Winning Number: ${winningNumber}\n💰 Jackpot: ${formatCHESS(round.jackpot)} CHESS\n🎫 Tickets Sold: ${totalTickets}\n\n${hasWinner ? `🏆 WINNER: @${winner?.player_name || 'Anonymous'}\n🎉 Congratulations! 🎉` : '😔 No winner this round...\n💎 Jackpot rolls over!'}\n\n🚗 Next round jackpot: ${formatCHESS(newRound?.jackpot || '0')} CHESS\n\n#LamboLottery #CHESS #Farcaster`,

      // Variáció 2: Drama style
      `⚡ BREAKING: Lambo Lottery Draw Complete! ⚡\n\n🎲 Round #${round.draw_number} Results:\n\n🏆 Winning Number: ${winningNumber}\n💰 Prize Pool: ${formatCHESS(round.jackpot)} CHESS\n🎫 Total Tickets: ${totalTickets}\n\n${hasWinner ? `🎊 WINNER FOUND! 🎊\n👑 @${winner?.player_name || 'Anonymous'} takes it all!\n🚗 Lambo incoming! 🚗` : `💸 No winner this time...\n📈 Jackpot grows to ${formatCHESS(newRound?.jackpot || '0')} CHESS!`}\n\n#LamboLottery #Jackpot #CHESS`,

      // Variáció 3: News style
      `📰 LAMBO LOTTERY DAILY REPORT 📰\n\nRound #${round.draw_number} Final Results:\n\n🎯 Winning Number: ${winningNumber}\n💎 Jackpot Amount: ${formatCHESS(round.jackpot)} CHESS\n🎫 Tickets Sold: ${totalTickets}\n\n${hasWinner ? `🏆 WINNER ANNOUNCED! 🏆\n👤 Player: @${winner?.player_name || 'Anonymous'}\n💰 Prize: ${formatCHESS(round.jackpot)} CHESS\n🚗 Lambo dreams come true! 🚗` : `📊 No winner this round\n💎 Jackpot carries over to next round\n📈 New jackpot: ${formatCHESS(newRound?.jackpot || '0')} CHESS`}\n\n#LamboLottery #DailyDraw #CHESS`,

      // Variáció 4: Celebration style
      `🎉 LAMBO LOTTERY CELEBRATION! 🎉\n\nRound #${round.draw_number} is COMPLETE!\n\n🎲 The winning number is: ${winningNumber}\n💰 Jackpot: ${formatCHESS(round.jackpot)} CHESS\n🎫 Tickets: ${totalTickets}\n\n${hasWinner ? `🏆 WE HAVE A WINNER! 🏆\n👑 Congratulations @${winner?.player_name || 'Anonymous'}!\n🚗 Your Lambo is waiting! 🚗\n🎊 Dreams do come true! 🎊` : `😔 No winner this round\n💎 But the jackpot grows!\n📈 Next round: ${formatCHESS(newRound?.jackpot || '0')} CHESS`}\n\n#LamboLottery #Winners #CHESS #Celebration`,

      // Variáció 5: Stats focused
      `📊 LAMBO LOTTERY STATS UPDATE 📊\n\nRound #${round.draw_number} Results:\n\n🎲 Winning Number: ${winningNumber}\n💎 Jackpot: ${formatCHESS(round.jackpot)} CHESS\n🎫 Tickets Sold: ${totalTickets}\n\n${hasWinner ? `🏆 Winner Found: @${winner?.player_name || 'Anonymous'}\n💰 Prize Claimed: ${formatCHESS(round.jackpot)} CHESS\n📈 Next Round Jackpot: ${formatCHESS(newRound?.jackpot || '0')} CHESS` : `📊 No Winner This Round\n💎 Jackpot Rollover: ${formatCHESS(newRound?.jackpot || '0')} CHESS\n📈 Growth Rate: +${formatCHESS((parseInt(newRound?.jackpot || '0') - parseInt(round.jackpot)).toString())} CHESS`}\n\n#LamboLottery #Stats #CHESS #Data`,

      // Variáció 6: Community focused
      `🌍 LAMBO LOTTERY COMMUNITY UPDATE 🌍\n\nRound #${round.draw_number} Results:\n\n🎲 Winning Number: ${winningNumber}\n💰 Jackpot: ${formatCHESS(round.jackpot)} CHESS\n👥 Community Participation: ${totalTickets} tickets\n\n${hasWinner ? `🏆 COMMUNITY WINNER! 🏆\n👑 @${winner?.player_name || 'Anonymous'} wins the jackpot!\n🚗 Lambo dreams achieved! 🚗\n🤝 Thank you for playing! 🤝` : '💎 No winner this round\n📈 Jackpot grows for the community\n🚗 Next round could be yours!\n💪 Keep trying!'}\n\n#LamboLottery #Community #CHESS #Together`,

      // Variáció 7: Action oriented
      `⚡ LAMBO LOTTERY ACTION COMPLETE! ⚡\n\nRound #${round.draw_number} Draw Results:\n\n🎯 Winning Number: ${winningNumber}\n💸 Jackpot: ${formatCHESS(round.jackpot)} CHESS\n🎫 Tickets: ${totalTickets}\n\n${hasWinner ? `🏆 WINNER TAKES ALL! 🏆\n👑 @${winner?.player_name || 'Anonymous'} claims the prize!\n🚗 Lambo incoming! 🚗\n🎊 Action complete! 🎊` : '💸 No winner this round\n📈 Jackpot rolls over\n🚀 Next round starts now!\n💪 Ready for action!'}\n\n#LamboLottery #Action #CHESS #NextRound`,

      // Variáció 8: Mystery style
      `🔮 LAMBO LOTTERY MYSTERY SOLVED! 🔮\n\nRound #${round.draw_number} Revealed:\n\n🎲 The winning number is... ${winningNumber}!\n💰 Jackpot: ${formatCHESS(round.jackpot)} CHESS\n🎫 Tickets: ${totalTickets}\n\n${hasWinner ? `🏆 MYSTERY WINNER REVEALED! 🏆\n👑 @${winner?.player_name || 'Anonymous'} solved the puzzle!\n🚗 The Lambo is yours! 🚗\n🎭 Mystery solved! 🎭` : `😔 No winner this round\n💎 The mystery continues...\n📈 Jackpot grows to ${formatCHESS(newRound?.jackpot || '0')} CHESS\n🔮 What will next round bring?`}\n\n#LamboLottery #Mystery #CHESS #Revealed`,

      // Variáció 9: Achievement style
      `🏅 LAMBO LOTTERY ACHIEVEMENT UNLOCKED! 🏅\n\nRound #${round.draw_number} Complete!\n\n🎯 Winning Number: ${winningNumber}\n💎 Jackpot: ${formatCHESS(round.jackpot)} CHESS\n🎫 Tickets: ${totalTickets}\n\n${hasWinner ? `🏆 JACKPOT ACHIEVEMENT! 🏆\n👑 @${winner?.player_name || 'Anonymous'} unlocked the ultimate prize!\n🚗 Lambo achievement earned! 🚗\n🎖️ Legendary status achieved! 🎖️` : `📊 No winner this round\n💎 Jackpot achievement pending\n📈 Next round: ${formatCHESS(newRound?.jackpot || '0')} CHESS\n🏆 Achievement still available!`}\n\n#LamboLottery #Achievement #CHESS #Success`,

      // Variáció 10: Future focused
      `🚀 LAMBO LOTTERY FUTURE UPDATE! 🚀\n\nRound #${round.draw_number} Results:\n\n🎲 Winning Number: ${winningNumber}\n💰 Jackpot: ${formatCHESS(round.jackpot)} CHESS\n🎫 Tickets: ${totalTickets}\n\n${hasWinner ? `🏆 FUTURE WINNER! 🏆\n👑 @${winner?.player_name || 'Anonymous'} secures their future!\n🚗 Lambo dreams realized! 🚗\n🌟 The future is bright! 🌟` : `💎 No winner this round\n📈 Future jackpot grows!\n🚀 Next round: ${formatCHESS(newRound?.jackpot || '0')} CHESS\n🌟 Your future Lambo awaits!`}\n\n#LamboLottery #Future #CHESS #Innovation`
    ];

    // Random variáció kiválasztása
    const randomIndex = Math.floor(Math.random() * postVariations.length);
    const selectedPost = postVariations[randomIndex];

    // Email értesítés küldése
    const emailContent = `
🎰 LAMBO LOTTERY DRAW COMPLETED! 🎰

Round #${round.draw_number} Results:
- Winning Number: ${winningNumber}
- Jackpot: ${formatCHESS(round.jackpot)} CHESS
- Tickets Sold: ${totalTickets}
- Winner: ${hasWinner ? `@${winner?.player_name || 'Anonymous'}` : 'None'}
- Next Round Jackpot: ${formatCHESS(newRound?.jackpot || '0')} CHESS

Selected Farcaster Post (Variation ${randomIndex + 1}):
${selectedPost}

All Post Variations:
${postVariations.map((post, index) => `${index + 1}. ${post.split('\n')[0]}`).join('\n')}

Timestamp: ${new Date().toISOString()}
    `;

    // Email küldése
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/lottery/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailContent,
          selectedPost,
          allVariations: postVariations,
          roundData: round,
          winnerData: winner,
          hasWinner
        })
      });

      if (emailResponse.ok) {
        console.log('✅ Lambo Lottery email sent successfully');
      } else {
        console.log('⚠️ Lambo Lottery email sending failed');
      }
    } catch (emailError) {
      console.log('⚠️ Lambo Lottery email sending error (non-critical):', emailError);
    }

    // Farcaster posztolás
    try {
      console.log('📱 Posting Lambo Lottery to Farcaster...');
      const farcasterResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/farcaster/post-neynar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: selectedPost,
          embeds: [{
            url: 'https://farc-nu.vercel.app',
            title: 'Lambo Lottery Results',
            description: `Round #${round.draw_number} completed! ${hasWinner ? 'Winner found!' : 'No winner - jackpot rolls over!'}`
          }]
        })
      });

      if (farcasterResponse.ok) {
        const farcasterResult = await farcasterResponse.json();
        console.log('✅ Lambo Lottery posted to Farcaster successfully:', farcasterResult.castHash);
      } else {
        console.log('⚠️ Lambo Lottery Farcaster posting failed');
      }
    } catch (farcasterError) {
      console.log('⚠️ Lambo Lottery Farcaster posting error (non-critical):', farcasterError);
    }

    console.log('📧 Lambo Lottery email content:', emailContent);
    console.log('📱 Selected Farcaster post:', selectedPost);

    return NextResponse.json({
      success: true,
      selectedPost,
      allVariations: postVariations,
      emailContent,
      message: 'Lambo Lottery post variations generated and email sent successfully'
    });

  } catch (error) {
    console.error('Error generating Lambo Lottery post variations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate Lambo Lottery post variations' },
      { status: 500 }
    );
  }
}
