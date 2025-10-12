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
    const { type } = await request.json();
    
    let emailContent = '';
    let subject = '';

    if (type === 'weather-lotto') {
      subject = '🌤️ Weather Lotto Test Results - Round #123 - SUNNY';
      emailContent = `
🌤️ WEATHER LOTTO DRAW RESULTS 🌤️

Round: #123
Winning Side: SUNNY
Total Payout: 1,400.00 CHESS
Treasury: 600.00 CHESS

🏆 WINNERS:
1. FID 12345 - 2 tickets - 700.00 CHESS
2. FID 67890 - 1 ticket - 350.00 CHESS
3. FID 11111 - 3 tickets - 1,050.00 CHESS

---
This is an automated message from AppRank Weather Lotto.
      `.trim();
    } else if (type === 'lambo-lottery') {
      subject = '🏁 Lambo Lottery Test Results - Round #456 - Number 42';
      emailContent = `
🏁 LAMBO LOTTERY DRAW RESULTS 🏁

Round: #456
Winning Number: 42
Total Payout: 2,500,000.00 CHESS
Next Jackpot: 1,000,000.00 CHESS

🏆 WINNERS:
1. FID 12345 - Number 42 - 2,500,000.00 CHESS

---
This is an automated message from AppRank Lambo Lottery.
      `.trim();
    } else {
      subject = '🧪 AppRank Email Test';
      emailContent = `
🧪 EMAIL SYSTEM TEST 🧪

This is a test email to verify that the email notification system is working correctly.

✅ Email configuration: OK
✅ SMTP connection: OK
✅ Email sending: OK

---
This is a test message from AppRank.
      `.trim();
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: subject,
      text: emailContent,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Test email sent successfully (${type || 'general'})`);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully (${type || 'general'})`,
      type: type || 'general'
    });

  } catch (error) {
    console.error('❌ Error sending test email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
