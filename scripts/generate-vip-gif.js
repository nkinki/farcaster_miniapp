const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs = require('fs');

async function generateVipGif() {
    const width = 600;
    const height = 600;
    const totalFrames = 60; // Slower, smoother animation

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const imagePath = path.join(__dirname, '../public/diamond-vip.png');
    if (!fs.existsSync(imagePath)) {
        console.error('Error: Source image not found at', imagePath);
        return;
    }

    const img = await loadImage(imagePath);

    const encoder = new GIFEncoder(width, height);
    const outputPath = path.join(__dirname, '../public/og-animated.gif');
    const writeStream = fs.createWriteStream(outputPath);

    encoder.createReadStream().pipe(writeStream);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(60);  // Slower frame rate
    encoder.setQuality(10);

    console.log(`Generating ${totalFrames} frames with POWERFUL glow...`);

    for (let i = 0; i < totalFrames; i++) {
        const angle = (i / totalFrames) * Math.PI * 2;

        const rotateX = Math.sin(angle) * 12;
        const rotateY = Math.cos(angle) * 12;

        // 1. Draw Background
        const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
        bgGradient.addColorStop(0, '#111827'); // Darker background to make glow pop
        bgGradient.addColorStop(1, '#000000');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Add POWERFUL dynamic glow behind the card
        const glowRadius = 280 + Math.sin(angle) * 60;
        const glowGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, glowRadius);
        // More opaque and vibrant colors
        glowGradient.addColorStop(0, 'rgba(6, 182, 212, 0.45)'); // More cyan
        glowGradient.addColorStop(0.4, 'rgba(59, 130, 246, 0.25)'); // More blue
        glowGradient.addColorStop(0.7, 'rgba(139, 92, 246, 0.1)'); // Subtle purple edge
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);

        // 3D Perspective simulation
        const scaleX = Math.cos(rotateY * Math.PI / 180);
        const scaleY = Math.cos(rotateX * Math.PI / 180);

        ctx.rotate(rotateX * 0.004);
        ctx.scale(scaleX, scaleY);

        const cardW = 420;
        const cardH = 420;

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

        // Draw the card image
        ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);

        // Holographic glare effect
        const glareX = (Math.cos(angle) * 0.7 + 0.5) * cardW - cardW / 2;
        const glareY = (Math.sin(angle) * 0.7 + 0.5) * cardH - cardH / 2;

        const cardGlare = ctx.createRadialGradient(glareX, glareY, 0, glareX, glareY, cardW * 0.9);
        cardGlare.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        cardGlare.addColorStop(0.5, 'rgba(125, 211, 252, 0.15)');
        cardGlare.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = cardGlare;
        ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

        ctx.restore();

        encoder.addFrame(ctx);
        if (i % 15 === 0) console.log(`Processed frame ${i}...`);
    }

    encoder.finish();
    console.log(`Success! Animated GIF with POWERFUL glow saved to ${outputPath}`);
}

generateVipGif().catch(err => {
    console.error('Fatal error during GIF generation:', err);
});
