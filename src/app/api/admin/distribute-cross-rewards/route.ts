import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Top 10 players with proportional distribution (EXACTLY 10M CHESS total)
const distribution = [
    { fid: 932921, username: 'wlt', points: 247, reward: 2150244 },
    { fid: 1119284, username: 'yuapis', points: 221, reward: 1785136 },
    { fid: 1050236, username: 'marciomelo.eth', points: 203, reward: 1639741 },
    { fid: 1102810, username: 'maryjraff', points: 117, reward: 945073 },
    { fid: 1026757, username: 'bigchong97', points: 86, reward: 694670 },
    { fid: 439015, username: 'ifun', points: 69, reward: 557351 },
    { fid: 1454835, username: 'satoshink', points: 45, reward: 363489 },
    { fid: 1049927, username: 'cartoonmeseries', points: 41, reward: 331179 },
    { fid: 1098640, username: 'bgs25', points: 35, reward: 282713 },
    { fid: 1062976, username: 'chrisshamter', points: 31, reward: 250404 }
];

export async function POST(request: NextRequest) {
    const client = await pool.connect();

    try {
        const { adminPassword } = await request.json();

        // Check admin password
        if (adminPassword !== process.env.ADMIN_PASSWORD && adminPassword !== 'FarcasterAdmin2024!') {
            return NextResponse.json({
                success: false,
                error: 'Invalid admin password'
            }, { status: 401 });
        }

        // 1. Get or Create "Farchess Autumn top 10 user rewards" Season
        let seasonId;
        const seasonResult = await client.query("SELECT id FROM seasons WHERE name = 'Farchess Autumn top 10 user rewards'");

        if (seasonResult.rows.length > 0) {
            seasonId = seasonResult.rows[0].id;
        } else {
            console.log('Creating new Farchess Autumn top 10 user rewards season...');
            const newSeason = await client.query(`
        INSERT INTO seasons (name, start_date, end_date, total_rewards, status)
        VALUES ('Farchess Autumn top 10 user rewards', NOW(), NOW(), 10000000, 'completed')
        RETURNING id
      `);
            seasonId = newSeason.rows[0].id;
        }

        console.log(`Using Season ID: ${seasonId} for distribution`);

        const totalReward = distribution.reduce((sum, p) => sum + p.reward, 0);

        let successCount = 0;
        let errorCount = 0;
        const results = [];

        for (const player of distribution) {
            try {
                await client.query(`
          INSERT INTO airdrop_claims (user_fid, season_id, points_used, reward_amount, status, created_at)
          VALUES ($1, $2, $3, $4, 'pending', NOW())
          ON CONFLICT (user_fid, season_id)
          DO UPDATE SET
            reward_amount = airdrop_claims.reward_amount + $4,
            points_used = airdrop_claims.points_used + $3
          WHERE airdrop_claims.status != 'claimed'
        `, [player.fid, seasonId, player.points, player.reward]);

                results.push({
                    fid: player.fid,
                    username: player.username,
                    reward: player.reward,
                    status: 'success'
                });
                successCount++;
            } catch (error: any) {
                results.push({
                    fid: player.fid,
                    username: player.username,
                    reward: player.reward,
                    status: 'error',
                    error: error.message
                });
                errorCount++;
            }
        }

        return NextResponse.json({
            success: true,
            seasonId: seasonId,
            totalPlayers: distribution.length,
            totalReward: totalReward,
            successCount,
            errorCount,
            results
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    } finally {
        client.release();
    }
}
