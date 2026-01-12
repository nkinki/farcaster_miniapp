const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs = require('fs');

async function generateVipGif() {
    const width = 600;
    const height = 600;
    const totalFrames = 60;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const imagePath = path.join(__dirname, '../public/diamond-vip.png');
    if (!fs.existsSync(imagePath)) {
        console.error('Error: Source image not found at', imagePath);
        return;
    }

    const img = await loadImage(imagePath);

    // Predetermine particle positions for consistency
    const particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.8 + 0.2
        });
    }

    const encoder = new GIFEncoder(width, height);
    const outputPath = path.join(__dirname, '../public/og-animated.gif');
    const writeStream = fs.createWriteStream(outputPath);

    encoder.createReadStream().pipe(writeStream);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(60);
    encoder.setQuality(10);

    console.log(`Generating ${totalFrames} frames with "Congratulations" style...`);

    for (let i = 0; i < totalFrames; i++) {
        const angle = (i / totalFrames) * Math.PI * 2;

        const rotateX = Math.sin(angle) * 10;
        const rotateY = Math.cos(angle) * 10;

        // 1. Draw Deep Teal Background
        ctx.fillStyle = '#01161e'; // Very dark teal
        ctx.fillRect(0, 0, width, height);

        // 2. Add Particles (Stars)
        particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 3. Add Large Soft Cyan/Teal Glow behind everything
        const bgGlowRadius = 400 + Math.sin(angle) * 40;
        const bgGlow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, bgGlowRadius);
        bgGlow.addColorStop(0, 'rgba(8, 145, 178, 0.4)'); // Cyan-700
        bgGlow.addColorStop(0.4, 'rgba(6, 182, 212, 0.2)'); // Cyan-500
        bgGlow.addColorStop(0.8, 'rgba(8, 51, 68, 0.1)'); // Deep teal
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = bgGlow;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);

        // 4. 3D Perspective simulation for the card
        const scaleX = Math.cos(rotateY * Math.PI / 180);
        const scaleY = Math.cos(rotateX * Math.PI / 180);

        ctx.rotate(rotateX * 0.003);
        ctx.scale(scaleX, scaleY);

        const cardW = 430;
        const cardH = 430;

        // Apply rounded corners clip
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 30);
        } else {
            const x = -cardW / 2, y = -cardH / 2, w = cardW, h = cardH, r = 30;
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
        }
        ctx.clip();

        // Draw the image
        ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);

        // Holographic glare effect
        const glareX = (Math.cos(angle) * 0.8 + 0.5) * cardW - cardW / 2;
        const glareY = (Math.sin(angle) * 0.8 + 0.5) * cardH - cardH / 2;

        const cardGlare = ctx.createRadialGradient(glareX, glareY, 0, glareX, glareY, cardW * 0.8);
        cardGlare.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        cardGlare.addColorStop(0.5, 'rgba(165, 243, 252, 0.1)'); // Cyan-200
        cardGlare.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = cardGlare;
        ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

        ctx.restore();

        encoder.addFrame(ctx);
        if (i % 15 === 0) console.log(`Processed frame ${i}...`);
    }

    encoder.finish();
    console.log(`Success! "Congratulations" style GIF saved to ${outputPath}`);
}

generateVipGif().catch(err => {
    console.error('Fatal error during GIF generation:', err);
});
