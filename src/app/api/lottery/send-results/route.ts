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

    // Email content generation
    const emailSubject = `🎰 Lambo Lottery Draw #${round.draw_number} Results - ${hasWinner ? 'Winner Found!' : 'No Winner'}`;
    
    const emailHtml = `
      <h1>🎰 Lambo Lottery Draw Completed!</h1>
      <p>Round #${round.draw_number} has been drawn.</p>
      
      <h2>📊 Results:</h2>
      <ul>
        <li><strong>Winning Number:</strong> ${winningNumber}</li>
        <li><strong>Jackpot:</strong> ${formatCHESS(round.jackpot)} CHESS</li>
        <li><strong>Tickets Sold:</strong> ${totalTickets}</li>
        <li><strong>Winner:</strong> ${hasWinner ? `@${winner?.player_name || 'Anonymous'}` : 'None'}</li>
        <li><strong>Next Round Jackpot:</strong> ${formatCHESS(newRound?.jackpot || '0')} CHESS</li>
      </ul>
      
      ${hasWinner ? `
        <h2>🏆 Winner Details:</h2>
        <ul>
          <li><strong>Player FID:</strong> ${winner.fid}</li>
          <li><strong>Player Name:</strong> @${winner.player_name}</li>
          <li><strong>Jackpot Won:</strong> ${formatCHESS(winner.jackpot_won)} CHESS</li>
        </ul>
      ` : '<p>No winner this round. The jackpot rolls over!</p>'}
      
      <h2>📱 Farcaster Post:</h2>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
🎰 LAMBO LOTTERY RESULTS 🎰

Round #${round.draw_number} COMPLETED!

🎲 Winning Number: ${winningNumber}
💰 Jackpot: ${formatCHESS(round.jackpot)} CHESS
🎫 Tickets Sold: ${totalTickets}

${hasWinner ? `🏆 WINNER: @${winner?.player_name || 'Anonymous'}\n🎉 Congratulations! 🎉` : '😔 No winner this round...\n💎 Jackpot rolls over!'}

🚗 Next round jackpot: ${formatCHESS(newRound?.jackpot || '0')} CHESS

#LamboLottery #CHESS #Farcaster
      </pre>
      
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `;

    // Send email
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: emailSubject,
        html: emailHtml
      })
    });

    if (emailResponse.ok) {
      console.log('✅ Lottery results email sent successfully');
    } else {
      console.log('⚠️ Lottery results email failed');
    }

    return NextResponse.json({
      success: true,
      message: 'Lottery results email sent successfully',
      emailSubject,
      emailHtml
    });

  } catch (error) {
    console.error('❌ Error sending lottery results email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send lottery results email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
