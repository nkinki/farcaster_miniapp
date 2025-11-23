import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
    throw new Error('NEON_DB_URL environment variable is not set');
}

const sql = neon(process.env.NEON_DB_URL);

// HARDCODED DAILY CODE (In production, this should be in ENV or DB)
const DAILY_SECRET_CODE = "FREEMOON";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, castUrl, rewardPerShare, shareText, fid, username, displayName } = body;

        // 1. Validate Input
        if (!code || !castUrl || !fid || !username) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Validate Code
        if (code.toUpperCase() !== DAILY_SECRET_CODE) {
            return NextResponse.json({ error: 'Invalid daily code' }, { status: 403 });
        }

        // 3. Check if user already used code TODAY
        // We check if there is a usage record for this FID created within the last 24 hours 
        // OR strictly "today" based on server time. Let's use "since midnight UTC".
        const [usage] = await sql`
      SELECT * FROM daily_code_usages 
      WHERE fid = ${fid} 
      AND used_at > CURRENT_DATE
    `;

        if (usage) {
            return NextResponse.json({ error: 'You have already used the daily code today!' }, { status: 429 });
        }

        // 4. Create Promotion (10k budget)
        const totalBudget = 10000;
        const actualRewardPerShare = rewardPerShare || 1000; // Default 1000 if not provided

        // Insert promotion
        const [promotion] = await sql`
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
        ${fid}, 
        ${username}, 
        ${displayName || username}, 
        ${castUrl}, 
        ${shareText || ''}, 
        ${totalBudget}, 
        ${totalBudget}, 
        ${actualRewardPerShare}, 
        'active', 
        0
      ) RETURNING id;
    `;

        // 5. Record Usage
        await sql`
      INSERT INTO daily_code_usages (fid, code) 
      VALUES (${fid}, ${code.toUpperCase()})
    `;

        return NextResponse.json({
            success: true,
            message: 'Daily promotion created successfully!',
            promotionId: promotion.id
        });

    } catch (error: any) {
        console.error('API Error in POST /api/promotions/daily-code:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
