const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateGamingOgImage() {
  try {
    // Create canvas
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    
    // Create gaming-themed gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#1a1a2e'); // Dark blue
    gradient.addColorStop(0.5, '#16213e'); // Navy blue
    gradient.addColorStop(1, '#0f3460'); // Deep blue
    
    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    
    // Add gaming decorative elements
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    
    // Controller icon (simplified)
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(400, 150, 400, 200);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(420, 170, 80, 80);
    ctx.fillRect(500, 170, 80, 80);
    ctx.fillRect(580, 170, 80, 80);
    ctx.fillRect(660, 170, 80, 80);
    ctx.fillRect(420, 260, 80, 60);
    ctx.fillRect(500, 260, 80, 60);
    ctx.fillRect(580, 260, 80, 60);
    ctx.fillRect(660, 260, 80, 60);
    
    // Add decorative circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(1100, 530, 80, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(200, 500, 30, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add title
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('🎮 Gaming Miniapp', 200, 100);
    
    // Add subtitle
    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('Play games and have fun on Farcaster!', 200, 140);
    
    // Add features
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('🎯 Interactive gameplay', 200, 400);
    ctx.fillText('🏆 Leaderboards', 200, 430);
    ctx.fillText('👥 Multiplayer support', 200, 460);
    ctx.fillText('⭐ Achievements', 200, 490);
    
    // Add bottom text
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('your-gaming-domain.vercel.app', 600, 580);
    
    // Save to file
    const buffer = canvas.toBuffer('image/png');
    const pngPath = path.join(__dirname, 'public', 'gaming-og-image.png');
    fs.writeFileSync(pngPath, buffer);
    
    console.log('✅ Gaming OG image generated successfully: public/gaming-og-image.png');
  } catch (error) {
    console.error('❌ Error generating gaming OG image:', error);
  }
}

generateGamingOgImage(); 