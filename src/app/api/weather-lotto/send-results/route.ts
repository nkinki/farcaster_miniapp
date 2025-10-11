import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { round, winningSide, winners, totalPayout, treasuryAmount } = await request.json();
    
    // Wei to CHESS conversion constant
    const WEI_TO_CHESS = 1000000000000000000;

    // Helper function to format CHESS amounts
    const formatCHESS = (amount: string | number) => {
      return (parseInt(amount.toString()) / WEI_TO_CHESS).toFixed(2);
    };

    // Email content generation
    const emailSubject = `🌤️ Weather Lotto Draw #${round.round_number} Results - ${winningSide.toUpperCase()}`;
    
    const emailHtml = `
      <h1>🌤️ Weather Lotto Draw Completed!</h1>
      <p>Round #${round.round_number} has been drawn.</p>
      
      <h2>📊 Results:</h2>
      <ul>
        <li><strong>Winning Side:</strong> ${winningSide.toUpperCase()}</li>
        <li><strong>Total Payout:</strong> ${formatCHESS(totalPayout)} CHESS</li>
        <li><strong>Winners:</strong> ${winners.length} players</li>
        <li><strong>Treasury:</strong> ${formatCHESS(treasuryAmount)} CHESS</li>
      </ul>
      
      <h2>🏆 Winners:</h2>
      ${winners.length > 0 ? `
        <ul>
          ${winners.map((winner: any, index: number) => `
            <li>${index + 1}. FID ${winner.player_fid} - ${winner.quantity} tickets - ${formatCHESS(winner.payout_amount)} CHESS</li>
          `).join('')}
        </ul>
      ` : '<p>No winners this round.</p>'}
      
      <h2>📱 Farcaster Post:</h2>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
🎰 WEATHER LOTTO RESULTS 🎰

Round #${round.round_number} COMPLETED!

🏆 WINNING SIDE: ${winningSide.toUpperCase()}
💰 Total Payout: ${formatCHESS(totalPayout)} CHESS
🏛️ Treasury: ${formatCHESS(treasuryAmount)} CHESS
👥 Winners: ${winners.length} players

🎉 Congratulations to all winners! 🎉

#WeatherLotto #CHESS #Farcaster
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
      console.log('✅ Weather Lotto results email sent successfully');
    } else {
      console.log('⚠️ Weather Lotto results email failed');
    }

    return NextResponse.json({
      success: true,
      message: 'Weather Lotto results email sent successfully',
      emailSubject,
      emailHtml
    });

  } catch (error) {
    console.error('❌ Error sending weather lotto results email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send weather lotto results email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
