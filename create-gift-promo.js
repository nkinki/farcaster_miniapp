const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- KONFIGURÁCIÓ ---
const GIFT_CONFIG = {
    targetUsername: 'jesterinvestor', // Kinek adjuk?
    targetFid: 1175506,               // FID (fontos, hogy pontos legyen!)
    castUrl: 'https://warpcast.com/jesterinvestor/0x...', // Mit promózzon? (Ha nincs, placeholder kell)
    totalBudget: 100000,              // Mennyi pontot kapjon?
    rewardPerShare: 1000,             // Mennyibe kerül egy megosztás?
    displayName: 'JesterInvestor'     // Megjelenített név
};

async function createGiftPromotion() {
    try {
        console.log(`🎁 Creating GIFT promotion for ${GIFT_CONFIG.targetUsername}...`);

        // 1. Ellenőrizzük, hogy van-e már ilyen user
        // (Opcionális, de jó tudni)

        // 2. Beszúrjuk a promóciót
        // Megjegyzés: owner_fid = 0 vagy admin FID lehet, hogy jelezzük, ez ajándék
        // De a 'fid' mezőnek a user FID-jének kell lennie, hogy ő lássa és kezelhesse!

        const query = `
      INSERT INTO promotions (
        fid, 
        username, 
        display_name, 
        cast_url, 
        share_text, 
        total_budget, 
        remaining_budget, 
        reward_per_share, 
        status,
        owner_fid
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'active', 0
      ) RETURNING id;
    `;

        const values = [
            GIFT_CONFIG.targetFid,
            GIFT_CONFIG.targetUsername,
            GIFT_CONFIG.displayName,
            GIFT_CONFIG.castUrl,
            `Check out ${GIFT_CONFIG.targetUsername}'s cast!`, // Default share text
            GIFT_CONFIG.totalBudget,
            GIFT_CONFIG.totalBudget, // Kezdetben a remaining = total
            GIFT_CONFIG.rewardPerShare
        ];

        const { rows } = await pool.query(query, values);

        console.log(`✅ Promotion created successfully! ID: ${rows[0].id}`);
        console.log(`   User: ${GIFT_CONFIG.targetUsername} (FID: ${GIFT_CONFIG.targetFid})`);
        console.log(`   Budget: ${GIFT_CONFIG.totalBudget}`);

    } catch (error) {
        console.error('❌ Error creating promotion:', error);
    } finally {
        await pool.end();
    }
}

// createGiftPromotion();
// Kikommentelve, hogy véletlenül se fusson le, amíg nem hagyod jóvá!
