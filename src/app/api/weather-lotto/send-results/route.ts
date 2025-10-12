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
    const { round, winningSide, winners, totalPayout, treasuryAmount } = await request.json();

    if (!round || !winningSide) {
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Format the email content
    const winnersList = winners && winners.length > 0 
      ? winners.map((winner: any, index: number) => 
          `${index + 1}. FID ${winner.player_fid} - ${winner.quantity} tickets - ${(Number(winner.payout_amount) / 1e18).toFixed(2)} CHESS`
        ).join('\n')
      : 'No winners this round';

    const emailContent = `
🌤️ WEATHER LOTTO DRAW RESULTS 🌤️

Round: #${round.round_number}
Winning Side: ${winningSide.toUpperCase()}
Total Payout: ${(totalPayout / 1e18).toFixed(2)} CHESS
Treasury: ${(treasuryAmount / 1e18).toFixed(2)} CHESS

🏆 WINNERS:
${winnersList}

---
This is an automated message from AppRank Weather Lotto.
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🌤️ Weather Lotto Results - Round #${round.round_number} - ${winningSide.toUpperCase()}`,
      text: emailContent,
    };

    await transporter.sendMail(mailOptions);

    console.log('✅ Weather Lotto results email sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Weather Lotto results email sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending Weather Lotto results email:', error);
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