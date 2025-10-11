import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { emailContent, selectedPost, allVariations, roundData, winnerData, hasWinner } = await request.json();

    // Email transporter configuration
    const transporter = nodemailer.createTransport({
      service: 'gmail', // vagy más email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // HTML email template Lambo Lottery-hoz
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Lambo Lottery Draw Results</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #2c3e50; border-bottom: 3px solid #e74c3c; padding-bottom: 20px; margin-bottom: 30px; }
            .results { background: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .winner { background: #d5f4e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #27ae60; }
            .no-winner { background: #fdf2e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #f39c12; }
            .post-section { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .variations { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .variation { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #e74c3c; }
            .emoji { font-size: 1.2em; }
            .highlight { color: #e74c3c; font-weight: bold; }
            .winner-highlight { color: #27ae60; font-weight: bold; }
            .footer { text-align: center; color: #7f8c8d; margin-top: 30px; font-size: 0.9em; }
            .lambo { color: #e74c3c; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="emoji">🎰 Lambo Lottery Draw Results 🎰</h1>
                <p>Round #${roundData?.draw_number || 'N/A'} - ${new Date().toLocaleString()}</p>
            </div>

            <div class="results">
                <h2>📊 Draw Results</h2>
                <pre style="white-space: pre-wrap; font-family: monospace;">${emailContent}</pre>
            </div>

            ${hasWinner ? `
            <div class="winner">
                <h2 class="winner-highlight">🏆 WINNER ANNOUNCED! 🏆</h2>
                <p><strong>Player:</strong> @${winnerData?.player_name || 'Anonymous'}</p>
                <p><strong>Prize:</strong> <span class="lambo">${(parseInt(roundData?.jackpot || '0') / 1e18).toFixed(2)} CHESS</span></p>
                <p><strong>Winning Number:</strong> ${winnerData?.number || 'N/A'}</p>
                <p class="lambo">🚗 Lambo incoming! 🚗</p>
            </div>
            ` : `
            <div class="no-winner">
                <h2>😔 No Winner This Round</h2>
                <p>The jackpot rolls over to the next round!</p>
                <p><strong>Next Round Jackpot:</strong> <span class="lambo">${(parseInt(roundData?.jackpot || '0') / 1e18).toFixed(2)} CHESS</span></p>
            </div>
            `}

            <div class="post-section">
                <h2>📱 Selected Farcaster Post</h2>
                <div class="variation">
                    <pre style="white-space: pre-wrap; font-family: monospace;">${selectedPost}</pre>
                </div>
            </div>

            <div class="variations">
                <h2>🎨 All Post Variations</h2>
                ${allVariations?.map((variation: string, index: number) => `
                    <div class="variation">
                        <h3>Variation ${index + 1}</h3>
                        <pre style="white-space: pre-wrap; font-family: monospace; font-size: 0.9em;">${variation}</pre>
                    </div>
                `).join('') || 'No variations available'}
            </div>

            <div class="footer">
                <p>Generated automatically by Lambo Lottery System</p>
                <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Email küldése
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'admin@example.com',
      subject: `🎰 Lambo Lottery Draw Results - Round #${roundData?.draw_number || 'N/A'} ${hasWinner ? '- WINNER FOUND!' : '- No Winner'}`,
      text: emailContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Lambo Lottery email sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending Lambo Lottery email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send Lambo Lottery email' },
      { status: 500 }
    );
  }
}
