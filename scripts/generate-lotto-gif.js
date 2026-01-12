const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs = require('fs');

async function generateLottoGif() {
    // 1.91:1 Aspect Ratio (OG standard)
    const width = 600;
    const height = 314;
    const totalFrames = 40;

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
    encoder.setDelay(100);  // 10fps
    encoder.setQuality(20);

    console.log(`Generating Lambo Lotto GIF (${totalFrames} frames)...`);

    for (let i = 0; i < totalFrames; i++) {
        const progress = i / totalFrames;

        // 1. Subtle Zoom effect (Ken Burns)
        const scale = 1 + Math.sin(progress * Math.PI) * 0.05;
        const zoomWidth = width * scale;
        const zoomHeight = height * scale;
        const offX = (zoomWidth - width) / 2;
        const offY = (zoomHeight - height) / 2;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw image with zoom and center it
        ctx.drawImage(img, -offX, -offY, zoomWidth, zoomHeight);

        // 2. Add moving glare/shine effect across the main text
        // The text "BUY A LAMBO" is roughly in the center-top
        // We'll create a linear gradient that moves across diagonally
        const glareX = (progress * 2 - 1) * width * 1.5;
        const glareWidth = 150;

        ctx.save();
        // Create a diagonal clipping or area for the glare
        const glareGradient = ctx.createLinearGradient(glareX, 0, glareX + glareWidth, height);
        glareGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        glareGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)'); // Bright white shine
        glareGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = glareGradient;
        ctx.globalCompositeOperation = 'overlay'; // Overlay blend mode for nice shine
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // 3. Optional: Subtle vignette
        const vignette = ctx.createRadialGradient(width / 2, height / 2, height / 2, width / 2, height / 2, width * 0.7);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        encoder.addFrame(ctx);
        if (i % 10 === 0) console.log(`Processed frame ${i}...`);
    }

    encoder.finish();
    console.log(`Success! Animated Lambo Lotto GIF saved to ${outputPath}`);
}

generateLottoGif().catch(err => {
    console.error('Fatal error during GIF generation:', err);
});
