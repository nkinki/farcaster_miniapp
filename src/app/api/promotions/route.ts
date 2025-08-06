// FÁJL: /src/app/api/promotions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

// Promóciók listázása
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';

    let promotions;
    if (status === 'all') {
      promotions = await sql`SELECT * FROM promotions ORDER BY created_at DESC;`;
    } else {
      promotions = await sql`SELECT * FROM promotions WHERE status = ${status} ORDER BY created_at DESC;`;
    }
    
    return NextResponse.json({ promotions }, { status: 200 });
  } catch (error: any) {
    console.error('API Error in GET /api/promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

// Új promóció létrehozása
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fid, username, displayName, castUrl, shareText, 
      rewardPerShare, totalBudget, blockchainHash 
    } = body;

    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget || !blockchainHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newPromotion] = await sql`
      INSERT INTO promotions ${
        sql({
          fid: fid,
          username: username,
          display_name: displayName || null,
          cast_url: castUrl,
          share_text: shareText || null,
          reward_per_share: rewardPerShare,
          total_budget: totalBudget,
          remaining_budget: totalBudget, // A keret kezdetben a teljes budget
          status: 'active',
          blockchain_hash: blockchainHash,
        })
      }
      RETURNING id;
    `;

    return NextResponse.json({ success: true, promotion: newPromotion }, { status: 201 });

  } catch (error: any) {
    console.error('API Error in POST /api/promotions:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
        return NextResponse.json({ error: 'This promotion might already exist.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error while saving promotion.' }, { status: 500 });
  }
}