import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { round, winningNumber, winners, totalPayout, nextJackpot } = await request.json();

    if (!round || !winningNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Format the email content
    const winnersList = winners && winners.length > 0 
      ? winners.map((winner: any, index: number) => 
          `${index + 1}. FID ${winner.player_fid} - Number ${winner.number} - ${(winner.amount_won / 1e18).toFixed(2)} CHESS`
        ).join('\n')
      : 'No winners this round';

    // Calculate next jackpot properly
    const currentJackpot = parseInt(round.jackpot || '0', 10);
    const nextJackpotAmount = winners && winners.length > 0 
      ? 1000000000000000000000000 // 1M CHESS base if there were winners
      : currentJackpot; // Roll over if no winners

    const emailContent = `
🏁 LAMBO LOTTERY DRAW RESULTS 🏁

Round: #${round.draw_number}
Winning Number: ${winningNumber}
Total Payout: ${(totalPayout / 1e18).toFixed(2)} CHESS
Next Jackpot: ${(nextJackpotAmount / 1e18).toFixed(2)} CHESS

🏆 WINNERS:
${winnersList}

${winners && winners.length === 0 ? `
🎯 NO WINNERS THIS ROUND! 🎯

The jackpot rolls over to the next round!
Don't miss out - buy your tickets for tomorrow's draw!

💡 TIP: The more tickets you buy, the higher your chances of winning!
🎰 Next draw: Tomorrow at 19:05 UTC

Get your tickets now: https://farc-nu.vercel.app/promote
` : `
🎉 CONGRATULATIONS TO THE WINNERS! 🎉

The jackpot has been won and resets to 1,000,000 CHESS!
New round starts now - buy your tickets for the next draw!

🎰 Next draw: Tomorrow at 19:05 UTC
Get your tickets: https://farc-nu.vercel.app/promote
`}

---
This is an automated message from AppRank Lambo Lottery.
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🏁 Lambo Lottery Results - Round #${round.draw_number} - Number ${winningNumber}`,
      text: emailContent,
    };

    await transporter.sendMail(mailOptions);

    console.log('✅ Lambo Lottery results email sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Lambo Lottery results email sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending Lambo Lottery results email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}