// FÁJL: /src/app/api/promotions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL environment variable is not set');
}

const sql = neon(process.env.NEON_DB_URL);

// JAVÍTÁS: A problémás második argumentumot (`params`) teljesen eltávolítjuk.
// Az `id`-t manuálisan olvassuk ki az URL-ből, ami minden környezetben működik.
export async function GET(request: NextRequest) {
  try {
    // 1. Kiolvassuk a teljes URL-t
    const url = new URL(request.url);
    // 2. Szétvágjuk az útvonalat a '/' mentén
    const pathSegments = url.pathname.split('/');
    // 3. A dinamikus `[id]` mindig az utolsó elem lesz az útvonalban
    const idString = pathSegments[pathSegments.length - 1];

    const id = parseInt(idString, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid promotion ID in URL' },
        { status: 400 }
      );
    }

    const [promotion] = await sql`
      SELECT * FROM promotions WHERE id = ${id};
    `;

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ promotion });

  } catch (error) {
    console.error('API Error in GET /api/promotions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}