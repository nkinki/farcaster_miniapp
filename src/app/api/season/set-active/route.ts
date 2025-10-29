import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { seasonId, extendDays = 30 } = await request.json();
    if (!seasonId) {
      return NextResponse.json({ success: false, error: 'seasonId is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Mark current active seasons as completed (optional cleanup)
    await client.query(`UPDATE seasons SET status = 'completed', updated_at = NOW() WHERE status = 'active'`);

    // Activate target season; if end_date passed, extend
    await client.query(
      `UPDATE seasons
       SET status = 'active',
           end_date = CASE WHEN end_date <= NOW() THEN NOW() + ($2 || ' days')::interval ELSE end_date END,
           updated_at = NOW()
       WHERE id = $1`,
      [seasonId, extendDays]
    );

    const { rows } = await client.query(`SELECT id, name, status, start_date, end_date FROM seasons WHERE id = $1`, [seasonId]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, season: rows[0] });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}


export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const seasonIdParam = searchParams.get('seasonId');
    const extendDaysParam = searchParams.get('extendDays') || '30';

    const seasonId = seasonIdParam ? parseInt(seasonIdParam, 10) : NaN;
    const extendDays = parseInt(extendDaysParam, 10);

    if (!seasonId || Number.isNaN(seasonId)) {
      return NextResponse.json({ success: false, error: 'seasonId is required' }, { status: 400 });
    }

    await client.query('BEGIN');
    await client.query(`UPDATE seasons SET status = 'completed', updated_at = NOW() WHERE status = 'active'`);
    await client.query(
      `UPDATE seasons
       SET status = 'active',
           end_date = CASE WHEN end_date <= NOW() THEN NOW() + ($2 || ' days')::interval ELSE end_date END,
           updated_at = NOW()
       WHERE id = $1`,
      [seasonId, extendDays]
    );
    const { rows } = await client.query(`SELECT id, name, status, start_date, end_date FROM seasons WHERE id = $1`, [seasonId]);
    await client.query('COMMIT');
    return NextResponse.json({ success: true, season: rows[0] });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}


