import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL environment variable is not set');
}

const sql = neon(process.env.NEON_DB_URL);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'active';

    // JAVÍTÁS: A SELECT parancsot egy változóba tesszük, hogy ne kelljen ismételni,
    // és hozzáadjuk a hiányzó `contract_campaign_id` oszlopot.
    const selectFields = sql`
        id, fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, shares_count, remaining_budget,
        status, blockchain_hash, created_at, updated_at,
        contract_campaign_id
    `;

    let promotionsResult, totalResult;
    if (status === 'all') {
      promotionsResult = await sql`SELECT ${selectFields} FROM promotions ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`;
      totalResult = await sql`SELECT COUNT(*) FROM promotions;`;
    } else {
      promotionsResult = await sql`SELECT ${selectFields} FROM promotions WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};`;
      totalResult = await sql`SELECT COUNT(*) FROM promotions WHERE status = ${status};`;
    }

    const totalPromotions = parseInt(totalResult[0].count as string, 10);
    return NextResponse.json({ promotions: promotionsResult, total: totalPromotions });

  } catch (error) {
    console.error('API Error in GET /api/promotions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// A POST függvényed már helyes volt, de a teljesség kedvéért itt a végleges verzió.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fid, username, displayName, castUrl, shareText, 
      rewardPerShare, totalBudget, blockchainHash, status, 
      contractCampaignId 
    } = body;

    if (
      !fid || !username || !castUrl || !rewardPerShare || 
      !totalBudget || !status || contractCampaignId === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields, including contractCampaignId.' },
        { status: 400 }
      );
    }
    
    const [promotion] = await sql`
      INSERT INTO promotions (
        fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, blockchain_hash, status,
        contract_campaign_id
      ) VALUES (
        ${fid}, ${username}, ${displayName || null}, ${castUrl}, ${shareText || null},
        ${rewardPerShare}, ${totalBudget}, ${totalBudget}, ${blockchainHash || null}, ${status},
        ${contractCampaignId}
      )
      RETURNING *;
    `;

    return NextResponse.json({ promotion }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create promotion',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}