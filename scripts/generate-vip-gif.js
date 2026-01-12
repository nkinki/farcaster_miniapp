const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs = require('fs');

async function generateVipGif() {
    const width = 600;
    const height = 600;
    const totalFrames = 40; // Balanced for size and smoothness

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
    encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
    encoder.setDelay(50);  // 50ms = 20fps
    encoder.setQuality(10); // 1-30, lower is better but slower

    console.log(`Generating ${totalFrames} frames with gif-encoder-2...`);

    for (let i = 0; i < totalFrames; i++) {
        const angle = (i / totalFrames) * Math.PI * 2;

        // Similar rotation logic as DiamondCard.tsx
        const rotateX = Math.sin(angle) * 15;
        const rotateY = Math.cos(angle) * 15;

        // Clear canvas with deep background color
        ctx.fillStyle = '#1a1b26';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);

        // 3D Perspective simulation
        const scaleX = Math.cos(rotateY * Math.PI / 180);
        const scaleY = Math.cos(rotateX * Math.PI / 180);

        ctx.rotate(rotateX * 0.005);
        ctx.scale(scaleX, scaleY);

        const cardW = 450;
        const cardH = 450;

        // Apply rounded corners clip
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
        } else {
            // Fallback for older canvas versions
            const x = -cardW / 2, y = -cardH / 2, w = cardW, h = cardH, r = 24;
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

        // Add holographic glare effect
        const glareX = (Math.cos(angle) * 0.6 + 0.5) * cardW - cardW / 2;
        const glareY = (Math.sin(angle) * 0.6 + 0.5) * cardH - cardH / 2;

        const gradient = ctx.createRadialGradient(glareX, glareY, 0, glareX, glareY, cardW * 0.8);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

        ctx.restore();

        // Add frame to encoder
        encoder.addFrame(ctx);

        if (i % 10 === 0) console.log(`Processed frame ${i}...`);
    }

    encoder.finish();

    console.log(`Success! Animated GIF saved to ${outputPath}`);
}

generateVipGif().catch(err => {
    console.error('Fatal error during GIF generation:', err);
});
