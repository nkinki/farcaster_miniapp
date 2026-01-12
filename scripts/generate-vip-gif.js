const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs = require('fs');

async function generateVipGif() {
    const width = 600;
    const height = 314;
    const totalFrames = 40; // Optimized for size and sharing

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
    encoder.setDelay(100);  // 100ms delay = slow motion (10fps)
    encoder.setQuality(20); // Lower quality = smaller file

    console.log(`Generating optimized ${totalFrames} frames...`);

    for (let i = 0; i < totalFrames; i++) {
        const angle = (i / totalFrames) * Math.PI * 2;

        // Very subtle, slow oscillation
        const rotateX = Math.sin(angle) * 8;
        const rotateY = Math.cos(angle) * 8;

        // 1. Solid Pure Black Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // 2. Large Soft "Aura" Glow (behind the card)
        const glowPulse = 1 + Math.sin(angle) * 0.1;
        const auraRadius = 350 * glowPulse;
        const auraGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, auraRadius);
        auraGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)'); // Cyan-500
        auraGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)'); // Blue-500
        auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = auraGradient;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);

        // 3. 3D Perspective simulation
        const scaleX = Math.cos(rotateY * Math.PI / 180);
        const scaleY = Math.cos(rotateX * Math.PI / 180);

        ctx.rotate(rotateX * 0.003);
        ctx.scale(scaleX, scaleY);

        const cardW = 380;
        const cardH = 240;

        // Add a "Outer Glow" stroke effect to the card itself
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
        }
        ctx.stroke();

        // Apply rounded corners clip
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
        } else {
            const x = -cardW / 2, y = -cardH / 2, w = cardW, h = cardH, r = 32;
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

        // Holographic glare effect (slower)
        const glareX = (Math.cos(angle * 0.5) * 0.7 + 0.5) * cardW - cardW / 2;
        const glareY = (Math.sin(angle * 0.5) * 0.7 + 0.5) * cardH - cardH / 2;

        const cardGlare = ctx.createRadialGradient(glareX, glareY, 0, glareX, glareY, cardW * 0.9);
        cardGlare.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        cardGlare.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        cardGlare.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = cardGlare;
        ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

        ctx.restore();

        encoder.addFrame(ctx);
        if (i % 20 === 0) console.log(`Processed frame ${i}...`);
    }

    encoder.finish();
    console.log(`Success! Optimized GIF saved to ${outputPath}`);
}

generateVipGif().catch(err => {
    console.error('Fatal error during GIF generation:', err);
});
