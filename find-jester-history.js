const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findHistory() {
    try {
        console.log('--- SEARCHING HISTORY FOR jesterinvestor ---');

        // 1. Get all promotions by username (case insensitive)
        const { rows: promos } = await pool.query(`
        SELECT id, fid, owner_fid, username, status, created_at, total_budget 
        FROM promotions 
        WHERE username ILIKE 'jesterinvestor'
        ORDER BY created_at ASC
    `);

        console.log(`Found ${promos.length} promotions by username.`);

        let targetFid = null;

        if (promos.length > 0) {
            promos.forEach(p => {
                console.log(`[${p.created_at.toISOString().split('T')[0]}] ID:${p.id} Status:${p.status} FID:${p.fid} OwnerFID:${p.owner_fid}`);
                if (p.fid && p.fid > 0) targetFid = p.fid;
                if (p.owner_fid && p.owner_fid > 0) targetFid = p.owner_fid;
            });
        }

        // 2. If we found an FID, search for ANY other promotions by this FID
        if (targetFid) {
            console.log(`\n🔍 Searching by FID: ${targetFid}...`);
            const { rows: byFid } = await pool.query(`
            SELECT id, username, status, created_at 
            FROM promotions 
            WHERE (fid = $1 OR owner_fid = $1)
            AND username NOT ILIKE 'jesterinvestor'
        `, [targetFid]);

            if (byFid.length > 0) {
                console.log(`Found ${byFid.length} additional promotions by FID (different username):`);
                byFid.forEach(p => {
                    console.log(`[${p.created_at.toISOString().split('T')[0]}] ID:${p.id} User:${p.username} Status:${p.status}`);
                });
            } else {
                console.log('No additional promotions found by FID with different username.');
            }
        } else {
            console.log('\n⚠️ No valid FID found in these promotions to search further.');
        }

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await pool.end();
    }
}

findHistory();
