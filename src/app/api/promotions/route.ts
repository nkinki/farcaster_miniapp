import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL környezeti változó nincs beállítva')
}

const sql = neon(process.env.NEON_DB_URL);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'active'

    const [promotionsResult, totalResult] = await Promise.all([
      sql`
        SELECT 
            id, fid, username, display_name, cast_url, share_text,
            reward_per_share, total_budget, shares_count, remaining_budget,
            status, blockchain_hash, created_at, updated_at
        FROM promotions
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `,
      sql`SELECT COUNT(*) FROM promotions WHERE status = ${status};`
    ]);

    const totalPromotions = parseInt(totalResult[0].count as string, 10);

    return NextResponse.json({
      promotions: promotionsResult,
      total: totalPromotions,
      limit,
      offset,
      status
    });

  } catch (error) {
    console.error('API hiba:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/promotions called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { fid, username, displayName, castUrl, shareText, rewardPerShare, totalBudget, blockchainHash, status } = body;

    // Validate required fields
    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget) {
      console.error('Missing required fields:', { fid, username, castUrl, rewardPerShare, totalBudget });
      return NextResponse.json(
        { error: `Missing required fields: ${!fid ? 'fid ' : ''}${!username ? 'username ' : ''}${!castUrl ? 'castUrl ' : ''}${!rewardPerShare ? 'rewardPerShare ' : ''}${!totalBudget ? 'totalBudget' : ''}` },
        { status: 400 }
      );
    }

    console.log('Creating promotion with data:', {
      fid,
      username,
      displayName,
      castUrl,
      shareText,
      rewardPerShare,
      totalBudget,
      blockchainHash,
      status
    });

    // Create promotion directly in Neon DB
    const [promotion] = await sql`
      INSERT INTO promotions (
        fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, blockchain_hash, status
      ) VALUES (
        ${fid}, ${username}, ${displayName || null}, ${castUrl}, ${shareText || null},
        ${rewardPerShare}, ${totalBudget}, ${totalBudget}, ${blockchainHash || null}, ${status || "inactive"}
      )
      RETURNING *;
    `;

    console.log('Promotion created successfully:', promotion);
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create promotion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 