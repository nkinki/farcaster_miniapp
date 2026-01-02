const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

async function createIcon() {
    const width = 1024;
    const height = 1024;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load the background image
    // Path needs to be absolute or relative to execution
    const bgPath = String.raw`C:\Users\bwbst\.gemini\antigravity\brain\9b18b63a-3a7d-40e5-9920-21c2d48027ab\icon_concept_vice_sunset_1766685485910.png`;

    try {
        const image = await loadImage(bgPath);
        ctx.drawImage(image, 0, 0, width, height);

        // Apply a slight dark overlay to improve text contrast if needed? 
        // The user wants legible text. Let's add a slight gradient at the bottom or top?
        // Actually the prompt said "text layers OVER the sunset". The sunset is in the middle-top.
        // The car is at bottom.
        // Let's put text in the middle, slightly overlapping.

        // Text Settings
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Impact font is usually available, or Arial Black
        // Let's use system font fallback
        ctx.font = '900 160px "Arial Black", "Impact", sans-serif';

        // Shadow/Outline for legibility
        ctx.shadowColor = 'rgba(0, 0, 0, 1)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 8;
        ctx.shadowOffsetY = 8;

        // Gradient Text
        const gradient = ctx.createLinearGradient(0, 200, 0, 800);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#00f2ff'); // Cyan
        gradient.addColorStop(1, '#ff00ff'); //  Pink

        // Draw "BUY A"
        ctx.fillStyle = gradient; // gradient fill

        // Stroke
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 15;

        // Position: "BUY A" slightly above center
        const centerX = width / 2;
        const topY = height / 2 - 80;
        const bottomY = height / 2 + 80;

        // Stroke first
        ctx.strokeText('BUY A', centerX, topY);
        ctx.fillText('BUY A', centerX, topY);

        // Draw "LAMBO"
        // Heavier stroke
        ctx.strokeText('LAMBO', centerX, bottomY);
        ctx.fillText('LAMBO', centerX, bottomY);

        // Add a final glow?
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

    } catch (err) {
        console.error('Error loading image:', err);
        return;
    }

    const buffer = canvas.toBuffer('image/png');
    const outPath = String.raw`C:\Users\bwbst\farcaster_miniapp\miniapps\lambo-lotto\public\icon.png`;
    // Also save a copy to artifacts for user review
    const detailPath = String.raw`C:\Users\bwbst\.gemini\antigravity\brain\9b18b63a-3a7d-40e5-9920-21c2d48027ab\generated_icon_text_overlay.png`;

    fs.writeFileSync(outPath, buffer);
    fs.writeFileSync(detailPath, buffer);
    console.log('Icon created successfully at:', outPath);
}

createIcon();
