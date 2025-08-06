// FÁJL: /src/app/api/promotions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export const dynamic = 'force-dynamic';

// JAVÍTÁS: A `params` objektum helyes típusdefiníciója
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid promotion ID' }, { status: 400 });
    }

    const [promotion] = await sql`SELECT * FROM promotions WHERE id = ${id};`;

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json({ promotion });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}