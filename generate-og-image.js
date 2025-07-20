const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateOgImage() {
  try {
    // Create canvas
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    
    // Create modern neon gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#1a1a2e'); // Dark purple
    gradient.addColorStop(0.3, '#16213e'); // Navy blue
    gradient.addColorStop(0.7, '#0f3460'); // Deep blue
    gradient.addColorStop(1, '#1a1a2e'); // Dark purple
    
    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    
    // Add neon decorative elements
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
    
    // Add title with neon glow
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('🏆 Miniapps Rankings', 200, 200);
    
    // Reset shadow for subtitle
    ctx.shadowBlur = 0;
    
    // Add subtitle
    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
    ctx.fillText('Farcaster miniapp toplist and statistics', 200, 240);
    
    // Add features with neon colors
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
    ctx.fillText('📊 Real-time rankings', 200, 280);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.fillText('📈 24h, 72h, weekly changes', 200, 310);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
    ctx.fillText('🏷️ Category-based browsing', 200, 340);
    ctx.fillStyle = 'rgba(236, 72, 153, 0.8)';
    ctx.fillText('⭐ Favorites management', 200, 370);
    
    // Add neon border effect
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, 1100, 530);
    
    // Add bottom text
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('farcaster-miniapp-rangsor.vercel.app', 600, 580);
    
    // Save to file
    const buffer = canvas.toBuffer('image/png');
    const pngPath = path.join(__dirname, 'public', 'og-image.png');
    fs.writeFileSync(pngPath, buffer);
    
    console.log('✅ Neon OG image generated successfully: public/og-image.png');
  } catch (error) {
    console.error('❌ Error generating neon OG image:', error);
  }
}

generateOgImage(); 