const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs = require('fs');

async function generateLottoGif() {
    // 1.91:1 Aspect Ratio (OG standard)
    const width = 600;
    const height = 314;
    const totalFrames = 50; // Increased frames for better flicker + smooth loop

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const imagePath = path.join(__dirname, '../miniapps/lambo-lotto/public/og-image.png');
    if (!fs.existsSync(imagePath)) {
        console.error('Error: Source image not found at', imagePath);
        return;
    }

    const img = await loadImage(imagePath);

    const encoder = new GIFEncoder(width, height);
    const outputPath = path.join(__dirname, '../miniapps/lambo-lotto/public/og-animated.gif');
    const writeStream = fs.createWriteStream(outputPath);

    encoder.createReadStream().pipe(writeStream);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(80);  // Slightly faster for better flicker feel
    encoder.setQuality(20);

    console.log(`Generating Lambo Lotto GIF with NEON FLICKER (${totalFrames} frames)...`);

    for (let i = 0; i < totalFrames; i++) {
        const progress = i / totalFrames;

        // 1. Neon Flicker Logic (First 15 frames)
        let opacity = 1.0;
        let showGlow = true;

        if (i < 15) {
            // Faulty flicker pattern: [0,1,1,0,1,0,1,1,1,0...]
            const flickerPattern = [0.4, 1.0, 1.0, 0.3, 1.0, 0.4, 1.0, 1.0, 0.9, 0.3, 1.0, 1.0, 1.0, 0.5, 1.0];
            opacity = flickerPattern[i];
            showGlow = opacity > 0.6;
        }

        // 2. Subtle Zoom effect (Ken Burns) - slower oscillation
        const scale = 1 + Math.sin(progress * Math.PI) * 0.04;
        const zoomWidth = width * scale;
        const zoomHeight = height * scale;
        const offX = (zoomWidth - width) / 2;
        const offY = (zoomHeight - height) / 2;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw image with flicker opacity
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, -offX, -offY, zoomWidth, zoomHeight);
        ctx.globalAlpha = 1.0;

        // 3. Pink Neon Aura during flicker or always subtly
        if (showGlow) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const glowGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
            glowGradient.addColorStop(0, 'rgba(255, 0, 255, 0.15)'); // Vice Pink
            glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glowGradient;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        // 4. Moving glare/shine (sweeps after flicker)
        if (i >= 10) {
            const glareProgress = (i - 10) / (totalFrames - 10);
            const glareX = (glareProgress * 2 - 1) * width * 1.5;
            const glareWidth = 120;

            ctx.save();
            const glareGradient = ctx.createLinearGradient(glareX, 0, glareX + glareWidth, height);
            glareGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            glareGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)'); // Shine
            glareGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = glareGradient;
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }

        encoder.addFrame(ctx);
        if (i % 10 === 0) console.log(`Processed frame ${i}...`);
    }

    encoder.finish();
    console.log(`Success! Neon Flickering Lambo Lotto GIF saved to ${outputPath}`);
}

generateLottoGif().catch(err => {
    console.error('Fatal error during GIF generation:', err);
});
