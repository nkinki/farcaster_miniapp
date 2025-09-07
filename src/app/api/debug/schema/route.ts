// FÁJL: src/app/api/debug/schema/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  // Biztonsági ellenőrzés: csak egy titkos kulccsal engedélyezzük a séma lekérdezését
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_API_KEY) { // Állíts be egy ADMIN_API_KEY-t a Vercelen!
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    const schema: Record<string, any> = {};

    for (const table of tables) {
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      schema[table] = columnsResult.rows;
    }
    
    return NextResponse.json({ success: true, schema });

  } catch (error: any) {
    console.error('Schema fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch schema', details: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}