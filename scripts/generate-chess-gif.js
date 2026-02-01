const { createCanvas, loadImage } = require('canvas');
const GifEncoder = require('gif-encoder-2');
const fs = require('fs');
const path = require('path');

async function createChessGif() {
    console.log('♟️ Starting Chess GIF generation (900x600 + Slow + Shine)...');

    // New Dims
    const width = 900;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const encoder = new GifEncoder(width, height);
    const outputStream = fs.createWriteStream(path.join(__dirname, '../public/chess-animated.gif'));

    encoder.createReadStream().pipe(outputStream);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(50); // 20 fps
    encoder.setQuality(10);

    // Load Base Image
    const imagePath = path.join(__dirname, '../public/chess-base.jpg');
    let baseImage;
    try {
        baseImage = await loadImage(imagePath);
    } catch (e) {
        console.error("❌ Could not load chess-base.jpg", e);
        return;
    }

    // --- Layout Calculations for 900x600 ---
    const imgAspect = baseImage.width / baseImage.height;
    // Max constraints
    let drawH = 540; // Fit in 600 height with margins
    let drawW = drawH * imgAspect;
    if (drawW > 800) { // Max width constraint
        drawW = 800;
        drawH = drawW / imgAspect;
    }
    const padding = 5;
    const wrapperW = drawW + (padding * 2);
    const wrapperH = drawH + (padding * 2);
    const startX = (width - wrapperW) / 2;
    const startY = (height - wrapperH) / 2;

    // Gradient Sweep Canvas
    const sweepSize = Math.max(wrapperW, wrapperH) * 1.5;
    const sweepCanvas = createCanvas(sweepSize, sweepSize);
    const sweepCtx = sweepCanvas.getContext('2d');
    const cx = sweepSize / 2;
    const cy = sweepSize / 2;

    for (let i = 0; i < 360; i++) {
        const angle = (i * Math.PI) / 180;

        let alpha = 0;
        let r = 6, g = 182, b = 212;

        if (i > 200) {
            alpha = (i - 200) / 160;
            alpha = alpha * alpha * 0.8;
            if (i > 340) {
                r = 200; g = 250; b = 255;
                alpha = 1.0;
            }
        }

        if (alpha > 0) {
            sweepCtx.beginPath();
            sweepCtx.moveTo(cx, cy);
            sweepCtx.lineTo(cx + Math.cos(angle) * sweepSize, cy + Math.sin(angle) * sweepSize);
            sweepCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            sweepCtx.lineWidth = 5;
            sweepCtx.stroke();
        }
    }

    // --- Animation Config ---
    const totalFrames = 80; // 4 seconds

    for (let i = 0; i < totalFrames; i++) {
        // 1. Background
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        const progress = i / totalFrames;

        // --- Effect 1: Edge Shine (Rotation) ---
        const angle = progress * Math.PI * 2;

        ctx.save();
        ctx.beginPath();
        roundRect(ctx, startX, startY, wrapperW, wrapperH, 20);
        ctx.clip();

        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle);
        ctx.drawImage(sweepCanvas, -sweepSize / 2, -sweepSize / 2);
        ctx.restore();

        // --- Inner Image ---
        const innerX = startX + padding;
        const innerY = startY + padding;
        const innerW = drawW;
        const innerH = drawH;

        ctx.save();
        ctx.beginPath();
        roundRect(ctx, innerX, innerY, innerW, innerH, 16);
        ctx.clip();

        // Draw Image
        ctx.drawImage(baseImage, innerX, innerY, innerW, innerH);

        // --- Effect 2: Glass Shine Overlay ---
        if (progress < 0.6) {
            const shineProg = progress / 0.6;

            const shineW = innerW * 2;
            const sX = innerX - shineW + (shineProg * (innerW + shineW + 150));

            ctx.save();
            const g = ctx.createLinearGradient(sX, innerY, sX + (innerW * 0.5), innerY);
            g.addColorStop(0, 'rgba(255,255,255,0)');
            g.addColorStop(0.4, 'rgba(255,255,255,0.05)');
            g.addColorStop(0.5, 'rgba(255,255,255,0.4)');
            g.addColorStop(0.6, 'rgba(255,255,255,0.05)');
            g.addColorStop(1, 'rgba(255,255,255,0)');

            ctx.transform(1, 0, -0.4, 1, 0, 0);
            ctx.fillStyle = g;
            ctx.fillRect(sX - 200, innerY - 200, innerW * 2, innerH * 2);
            ctx.restore();
        }

        ctx.restore();

        encoder.addFrame(ctx);
        if (i % 10 === 0) console.log(`   Frame ${i}/${totalFrames} encoded`);
    }

    encoder.finish();
    console.log('✅ GIF generated at public/chess-animated.gif');
}

function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

createChessGif().catch(console.error);
