import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json();

    // Email transporter configuration
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or other email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to || process.env.ADMIN_EMAIL,
      subject: subject || 'Farcaster Mini App Notification',
      html: html || text,
      text: text
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
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
