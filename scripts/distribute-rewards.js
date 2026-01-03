const path = require('path');
const fs = require('fs');

// Try loading from .env and .env.local
['.env', '.env.local'].forEach(file => {
    const envPath = path.resolve(__dirname, '../' + file);
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });

        // Manual helpers if dotenv behaves weirdly
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim();
                if (key === 'NEON_DB_URL' || key === 'DATABASE_URL' || key === 'POSTGRES_URL') {
                    if (!process.env[key]) process.env[key] = val;
                }
            }
        }
    }
});

// Fallback logic
if (!process.env.NEON_DB_URL && process.env.DATABASE_URL) {
    console.log('⚠️ NEON_DB_URL missing, using DATABASE_URL');
    process.env.NEON_DB_URL = process.env.DATABASE_URL;
}

if (!process.env.NEON_DB_URL && process.env.POSTGRES_URL) {
    console.log('⚠️ NEON_DB_URL missing, using POSTGRES_URL');
    process.env.NEON_DB_URL = process.env.POSTGRES_URL;
}

if (!process.env.NEON_DB_URL) {
    console.error('❌ Could not find NEON_DB_URL or DATABASE_URL in .env files');
    // Don't exit yet, maybe it works if globally set? (e.g. via Vercel env pull)
}

const { neon } = require('@neondatabase/serverless');

// Handle potential undefined
const connectionString = process.env.NEON_DB_URL || '';
const sql = neon(connectionString);

async function main() {
    console.log('🏆 Starting Season Reward Distribution...');

    try {
        // 1. Inspect airdrop_claims schema
        const columnsResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'airdrop_claims';
    `;
        const columns = columnsResult.map(c => c.column_name);
        console.log('📋 airdrop_claims columns:', columns.join(', '));

        const hasDescription = columns.includes('description');
        const hasReason = columns.includes('reason');
        const noteColumn = hasDescription ? 'description' : (hasReason ? 'reason' : null);

        // 2. Get Active Season
        const seasonResult = await sql`
      SELECT id, name FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
    `;

        if (seasonResult.length === 0) {
            console.error('❌ No active season found!');
            return;
        }

        const { id: seasonId, name: seasonName } = seasonResult[0];
        console.log(`📅 Active Season: ${seasonName} (ID: ${seasonId})`);

        // 3. Get Top 3 Users
        const leaderboard = await sql`
      SELECT 
        user_fid,
        total_points,
        total_shares,
        total_likes
      FROM user_season_summary
      WHERE season_id = ${seasonId} AND total_points > 0
      ORDER BY total_points DESC, last_activity DESC
      LIMIT 3
    `;

        if (leaderboard.length === 0) {
            console.log('⚠️ No users found on leaderboard.');
            return;
        }

        // 4. Define Rewards
        const rewards = [
            { rank: 1, amount: 25000, label: '🥇 Gold Reward' },
            { rank: 2, amount: 15000, label: '🥈 Silver Reward' },
            { rank: 3, amount: 5000, label: '🥉 Bronze Reward' }
        ];

        console.log('\n🏁 Top 3 Winners:');
        const distributions = [];

        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            const reward = rewards[i];

            console.log(`${reward.label}: FID ${user.user_fid} | Points: ${user.total_points} | Reward: ${reward.amount} $CHESS`);

            distributions.push({
                fid: user.user_fid,
                amount: reward.amount,
                note: `${seasonName} Rank #${i + 1} Reward`
            });
        }

        // 5. Ask for confirmation (simulated here by command line arg, or just defaulting to dry-run unless --execute is passed)
        const isExecute = process.argv.includes('--execute');

        if (!isExecute) {
            console.log('\n⚠️  DRY RUN MODE. Rerun with --execute to distribute rewards.');
            return;
        }

        console.log('\n🚀 Executing Distribution...');

        for (const dist of distributions) {
            if (noteColumn) {
                await sql`
                INSERT INTO airdrop_claims (user_fid, reward_amount, status, ${sql(noteColumn)})
                VALUES (${dist.fid}, ${dist.amount}, 'pending', ${dist.note})
            `;
            } else {
                await sql`
                INSERT INTO airdrop_claims (user_fid, season_id, reward_amount, status)
                VALUES (${dist.fid}, ${seasonId}, ${dist.amount}, 'pending')
            `;
            }
            console.log(`✅ Sent ${dist.amount} $CHESS to FID ${dist.fid}`);
        }

        console.log('\n✨ Distribution Complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
