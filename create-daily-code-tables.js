require('dotenv').config({ path: '.env.production' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function createTables() {
    try {
        console.log('Creating daily_codes table...');
        await sql`
      CREATE TABLE IF NOT EXISTS daily_codes (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
    `;
        console.log('✅ daily_codes table created.');

        console.log('Creating daily_code_usages table...');
        await sql`
      CREATE TABLE IF NOT EXISTS daily_code_usages (
        id SERIAL PRIMARY KEY,
        fid INTEGER NOT NULL,
        code TEXT NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(fid, code)
      );
    `;
        console.log('✅ daily_code_usages table created.');

        // Insert a default code for testing if none exists
        const existingCodes = await sql`SELECT * FROM daily_codes WHERE is_active = TRUE`;
        if (existingCodes.length === 0) {
            const defaultCode = 'START123';
            await sql`INSERT INTO daily_codes (code, is_active) VALUES (${defaultCode}, TRUE)`;
            console.log(`✅ Inserted default daily code: ${defaultCode}`);
        }

    } catch (error) {
        console.error('Error creating tables:', error);
    }
}

createTables();
