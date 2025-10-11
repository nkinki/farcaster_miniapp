import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { emailContent, selectedPost, allVariations, roundData } = await request.json();

    // Email transporter configuration
    const transporter = nodemailer.createTransport({
      service: 'gmail', // vagy más email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Weather Lotto Draw Results</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
            .results { background: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .post-section { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .variations { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .variation { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #3498db; }
            .emoji { font-size: 1.2em; }
            .highlight { color: #e74c3c; font-weight: bold; }
            .footer { text-align: center; color: #7f8c8d; margin-top: 30px; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="emoji">🌤️ Weather Lotto Draw Results 🌤️</h1>
                <p>Round #${roundData?.round_number || 'N/A'} - ${new Date().toLocaleString()}</p>
            </div>

            <div class="results">
                <h2>📊 Draw Results</h2>
                <pre style="white-space: pre-wrap; font-family: monospace;">${emailContent}</pre>
            </div>

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
                <p>Generated automatically by Weather Lotto System</p>
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
      subject: `🌤️ Weather Lotto Draw Results - Round #${roundData?.round_number || 'N/A'}`,
      text: emailContent,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
