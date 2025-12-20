const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
        console.error('Usage: node scripts/migrate.js <path-to-sql-file>');
        process.exit(1);
    }

    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DB_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL or NEON_DB_URL environment variable is not set');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();

    try {
        const sqlPath = path.resolve(migrationFile);
        console.log(`🚀 Running migration: ${sqlPath}`);

        if (!fs.existsSync(sqlPath)) {
            throw new Error(`File not found: ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
