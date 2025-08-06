// FÁJL: /src/app/api/promotions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL environment variable is not set');
}

const sql = neon(process.env.NEON_DB_URL);

// JAVÍTÁS: A GET függvény szignatúráját a Next.js által elvárt formátumra cseréljük.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // A `params` objektumból közvetlenül kiolvassuk az `id`-t.
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid promotion ID' },
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
    console.error(`API Error in GET /api/promotions/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}