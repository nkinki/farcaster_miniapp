import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL környezeti változó nincs beállítva')
}

const sql = neon(process.env.NEON_DB_URL);

// A GET függvény változatlan maradhat, az helyesen működik.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'active'

    let promotionsResult, totalResult;
    if (status === 'all') {
      promotionsResult = await sql`
        SELECT 
            id, fid, username, display_name, cast_url, share_text,
            reward_per_share, total_budget, shares_count, remaining_budget,
            status, blockchain_hash, created_at, updated_at
        FROM promotions
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
      totalResult = await sql`SELECT COUNT(*) FROM promotions;`;
    } else {
      promotionsResult = await sql`
        SELECT 
            id, fid, username, display_name, cast_url, share_text,
            reward_per_share, total_budget, shares_count, remaining_budget,
            status, blockchain_hash, created_at, updated_at
        FROM promotions
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
      totalResult = await sql`SELECT COUNT(*) FROM promotions WHERE status = ${status};`;
    }

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


// A POST függvényt javítjuk.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, username, displayName, castUrl, shareText, rewardPerShare, totalBudget, blockchainHash, status } = body;

    // JAVÍTÁS: A validációt kiterjesztjük a `status` mezőre is.
    // Most már kötelező megadni, hogy egy promóció milyen státusszal jön létre.
    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget || !status) {
      return NextResponse.json(
        { error: 'Missing required fields. All fields including status are required.' },
        { status: 400 }
      );
    }
    
    // JAVÍTÁS: Opcionális, de ajánlott: ellenőrizzük, hogy a status érvényes-e.
    const validStatuses = ['active', 'inactive', 'paused', 'completed'];
    if (!validStatuses.includes(status)) {
        return NextResponse.json(
            { error: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` },
            { status: 400 }
        );
    }

    // JAVÍTÁS: Az SQL parancsból eltávolítjuk a `|| "inactive"` részt.
    // A kód most már egyértelműen a frontend által küldött `status` értéket használja.
    const [promotion] = await sql`
      INSERT INTO promotions (
        fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, blockchain_hash, status
      ) VALUES (
        ${fid}, ${username}, ${displayName || null}, ${castUrl}, ${shareText || null},
        ${rewardPerShare}, ${totalBudget}, ${totalBudget}, ${blockchainHash || null}, ${status}
      )
      RETURNING *;
    `;

    console.log('Promotion created successfully with status:', status);
    return NextResponse.json({ promotion }, { status: 201 });

  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create promotion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}