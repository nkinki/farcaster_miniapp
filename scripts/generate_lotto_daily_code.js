const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

function generateCode() {
    const words = [
        'LAMBO', 'LOTTO', 'JACKPOT', 'TICKET', 'WINNER', 'LUCKY', 'FORTUNE',
        'MILLION', 'WHEEL', 'SPIN', 'DRIVE', 'FAST', 'SPEED', 'RACE', 'VROOM',
        'GOLD', 'DIAMOND', 'CASH', 'RICH', 'BIGWIN', 'SUPER'
    ];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomNumber = Math.floor(Math.random() * 900) + 100; // 100-999
    return `${randomWord}${randomNumber}`;
}

async function main() {
    try {
        const newCode = generateCode();
        console.log(`Generating new Lotto daily code: ${newCode}`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Deactivate all previous lotto codes
            await client.query('UPDATE lotto_daily_codes SET is_active = FALSE WHERE is_active = TRUE');

            // 2. Insert new lotto code
            await client.query(
                'INSERT INTO lotto_daily_codes (code, is_active) VALUES ($1, TRUE)',
                [newCode]
            );

            await client.query('COMMIT');
            console.log('✅ Successfully updated Lotto daily code.');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error generating Lotto daily code:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
