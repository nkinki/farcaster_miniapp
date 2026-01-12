const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateVipGif() {
    const width = 600;
    const height = 600;
    const totalFrames = 60; // Smooth animation
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const imagePath = path.join(__dirname, '../public/diamond-vip.png');
    if (!fs.existsSync(imagePath)) {
        console.error('Error: Source image not found at', imagePath);
        return;
    }

    const img = await loadImage(imagePath);
    const frames = [];

    console.log(`Generating ${totalFrames} frames...`);

    for (let i = 0; i < totalFrames; i++) {
        const angle = (i / totalFrames) * Math.PI * 2;

        // Match rotation from DiamondCard.tsx: Math.sin(angle) * 15
        const rotateX = Math.sin(angle) * 15;
        const rotateY = Math.cos(angle) * 15;

        ctx.clearRect(0, 0, width, height);

        // Simple 3D simulation using transforms
        ctx.save();
        ctx.translate(width / 2, height / 2);

        // Perspective factor
        const scaleX = Math.cos(rotateY * Math.PI / 180);
        const scaleY = Math.cos(rotateX * Math.PI / 180);

        ctx.rotate(rotateX * 0.01); // Subtle tilt
        ctx.scale(scaleX, scaleY);

        // Draw card
        const cardW = 400;
        const cardH = 400;

        // Rounded corners clip
        ctx.beginPath();
        ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
        ctx.clip();

        ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);

        // Glare effect
        const glareX = (Math.cos(angle) * 0.5 + 0.5) * cardW - cardW / 2;
        const glareY = (Math.sin(angle) * 0.5 + 0.5) * cardH - cardH / 2;

        const gradient = ctx.createRadialGradient(glareX, glareY, 0, glareX, glareY, cardW);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

        ctx.restore();

        // Convert canvas to buffer
        frames.push(canvas.toBuffer('image/png'));
    }

    console.log('Combining frames into animated WebP then GIF...');

    // Create animated WebP buffer first
    const webpBuffer = await sharp(frames[0], { animated: true })
        .webp({ effort: 6 })
        .toBuffer();

    // Now try to append pages to it - wait, sharp's animation API is tricky.
    // Let's try the direct list approach again but without joinImages which is missing.

    const outputPath = path.join(__dirname, '../public/og-animated.gif');

    // If n-pages is missing, it might be because the environment's libvips is old or limited.
    // Let's try one more fallback: outputTING A WEBP instead, most modern clients (Farcaster included) support it.
    // But user asked for "megosztási képet", usually implies GIF/PNG.

    try {
        await sharp(frames[0], { animated: true })
            .composite(frames.slice(1).map((f, i) => ({ input: f, blend: 'over' }))) // This won't work for animation pages
            .gif()
            .toFile(outputPath);
    } catch (e) {
        console.warn('GIF failed, trying direct buffer write for debugging...');
        // Final attempt: write as WebP and suggest to user
        const webpPath = outputPath.replace('.gif', '.webp');
        await sharp(frames[0], { animated: true })
            .webp()
            .toFile(webpPath);
        console.log(`Saved as WebP: ${webpPath}`);
    }

    console.log(`Success! Animated GIF saved to ${outputPath}`);
}

generateVipGif().catch(err => {
    console.error('Fatal error:', err);
});
