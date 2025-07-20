const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateOgImage() {
  try {
    // Create canvas
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#7C3AED');
    gradient.addColorStop(1, '#3B82F6');
    
    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    
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
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('🏆 Miniapps Rankings', 200, 200);
    
    // Add subtitle
    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('Farcaster miniapp toplist and statistics', 200, 240);
    
    // Add features
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('📊 Real-time rankings', 200, 280);
    ctx.fillText('📈 24h, 72h, weekly changes', 200, 310);
    ctx.fillText('🏷️ Category-based browsing', 200, 340);
    ctx.fillText('⭐ Favorites management', 200, 370);
    
    // Add bottom text
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('farcaster-miniapp-rangsor.vercel.app', 600, 580);
    
    // Save to file
    const buffer = canvas.toBuffer('image/png');
    const pngPath = path.join(__dirname, 'public', 'og-image.png');
    fs.writeFileSync(pngPath, buffer);
    
    console.log('✅ OG image generated successfully: public/og-image.png');
  } catch (error) {
    console.error('❌ Error generating OG image:', error);
  }
}

generateOgImage(); 