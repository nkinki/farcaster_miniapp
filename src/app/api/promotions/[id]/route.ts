import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL környezeti változó nincs beállítva')
}

const sql = neon(process.env.NEON_DB_URL);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid promotion ID' },
        { status: 400 }
      )
    }

    const [promotion] = await sql`
      SELECT 
          id, fid, username, display_name, cast_url, share_text,
          reward_per_share, total_budget, shares_count, remaining_budget,
          status, blockchain_hash, created_at, updated_at
      FROM promotions
      WHERE id = ${id};
    `;

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      promotion
    });

  } catch (error) {
    console.error('API hiba:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 