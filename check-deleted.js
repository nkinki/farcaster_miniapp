const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDeletedPromotions() {
    try {
        console.log('🔍 Checking for deleted_at column...');

        // Check if deleted_at column exists
        const { rows: columns } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promotions' AND column_name = 'deleted_at'
    `);

        if (columns.length > 0) {
            console.log('✅ "deleted_at" column exists. Checking for soft-deleted records...');

            const { rows: deleted } = await pool.query(`
            SELECT id, username, status, deleted_at 
            FROM promotions 
            WHERE deleted_at IS NOT NULL
        `);

            if (deleted.length > 0) {
                console.log(`\n🗑️ Found ${deleted.length} deleted promotions:`);
                deleted.forEach(p => {
                    console.log(`  ID: ${p.id}, User: ${p.username}, Status: ${p.status}, Deleted At: ${p.deleted_at}`);
                });
            } else {
                console.log('\nℹ️ No records found with deleted_at IS NOT NULL.');
            }
        } else {
            console.log('❌ "deleted_at" column does NOT exist.');

            // Check if there is any 'deleted' status that I missed (unlikely given previous distinct query, but good to double check)
            const { rows: deletedStatus } = await pool.query(`
            SELECT * FROM promotions WHERE status LIKE '%delete%'
        `);
            if (deletedStatus.length > 0) {
                console.log(`\n⚠️ Found ${deletedStatus.length} promotions with 'delete' in status:`);
                console.table(deletedStatus);
            } else {
                console.log('ℹ️ No promotions found with status containing "delete".');
            }
        }

    } catch (error) {
        console.error('❌ Error checking deleted promotions:', error);
    } finally {
        await pool.end();
    }
}

checkDeletedPromotions();
