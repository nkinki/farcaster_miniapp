// FILE: /src/app/api/promotions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL environment variable is not set');
}

const sql = neon(process.env.NEON_DB_URL);

// FIX: We completely remove the problematic second argument (`params`).
// We manually read the `id` from the URL, which works in all environments.
export async function GET(request: NextRequest) {
  try {
    // 1. Read the full URL
    const url = new URL(request.url);
    // 2. Split the path along '/'
    const pathSegments = url.pathname.split('/');
    // 3. The dynamic [id] will always be the last element in the path
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

export async function DELETE(request: NextRequest) {
  try {
    // 1. Read the full URL
    const url = new URL(request.url);
    // 2. Split the path along '/'
    const pathSegments = url.pathname.split('/');
    // 3. The dynamic [id] will always be the last element in the path
    const idString = pathSegments[pathSegments.length - 1];

    const id = parseInt(idString, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid promotion ID in URL' },
        { status: 400 }
      );
    }

    // Check if the campaign exists
    const [promotion] = await sql`
      SELECT * FROM promotions WHERE id = ${id};
    `;

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Delete the campaign
    await sql`
      DELETE FROM promotions WHERE id = ${id};
    `;

    return NextResponse.json({
      message: 'Promotion deleted successfully',
      deletedId: id
    });

  } catch (error) {
    console.error('API Error in DELETE /api/promotions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}