import { NextRequest, NextResponse } from 'next/server';
import { createCanvas } from 'canvas';

export async function POST(request: NextRequest) {
  try {
    const { fid, username, displayName, claimedAmount, totalEarnings, rank, points } = await request.json();

    if (!fid || !claimedAmount) {
      return NextResponse.json({ 
        success: false, 
        error: 'FID and claimed amount are required' 
      }, { status: 400 });
    }

    // Create canvas for shareable image
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    
    // Create modern gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#1a1a2e'); // Dark purple
    gradient.addColorStop(0.3, '#16213e'); // Navy blue
    gradient.addColorStop(0.7, '#0f3460'); // Deep blue
    gradient.addColorStop(1, '#1a1a2e'); // Dark purple
    
    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    
    // Add decorative elements
    ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(1100, 530, 80, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(200, 500, 30, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add neon glow effects
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 20;
    
    // Add main title
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 CHESS Claimed!', 600, 150);
    
    // Reset shadow for other text
    ctx.shadowBlur = 0;
    
    // Add user info
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${displayName || username || `FID ${fid}`}`, 600, 220);
    
    // Add claimed amount with special styling
    ctx.font = 'bold 42px Arial';
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`${claimedAmount.toLocaleString()} CHESS`, 600, 280);
    
    // Add stats
    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
    
    if (totalEarnings) {
      ctx.fillText(`Total Earnings: ${totalEarnings.toLocaleString()} CHESS`, 600, 330);
    }
    
    if (rank) {
      ctx.fillText(`Rank: #${rank}`, 600, 370);
    }
    
    if (points) {
      ctx.fillText(`Points: ${points.toLocaleString()}`, 600, 410);
    }
    
    // Add promotional text
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('🚀 Join the CHESS Revolution!', 600, 480);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
    ctx.fillText('Earn rewards by sharing, liking, and engaging', 600, 520);
    
    // Add neon border effect
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, 1100, 530);
    
    // Add bottom branding
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.fillText('farcaster-miniapp-rangsor.vercel.app', 600, 580);
    
    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Return the image as base64
    const base64Image = buffer.toString('base64');
    
    return NextResponse.json({ 
      success: true, 
      imageData: `data:image/png;base64,${base64Image}`,
      imageUrl: `data:image/png;base64,${base64Image}`
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error generating share image:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate share image' 
    }, { status: 500 });
  }
}
