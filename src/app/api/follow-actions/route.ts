import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type FollowActionBody = {
  user_fid: number;
  target_fid: number;
  promotion_id?: number | null;
};

async function getActiveSeasonId(client: any): Promise<number | null> {
  const res = await client.query(`SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`);
  return res.rows.length ? res.rows[0].id : null;
}

// Placeholder auto-verifier. Replace with Farcaster Hub/Neynar check later.
async function autoVerifyFollow(_userFid: number, _targetFid: number): Promise<{ verified: boolean; source: 'auto' | 'manual' }>{
  // TODO: Integrate Farcaster Hub or Neynar to check follow graph + timestamp
  return { verified: false, source: 'auto' };
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body: FollowActionBody = await request.json();
    const user_fid = Number(body.user_fid);
    const target_fid = Number(body.target_fid);
    const promotion_id = body.promotion_id ?? null;

    if (!user_fid || !target_fid) {
      return NextResponse.json({ success: false, error: 'user_fid and target_fid are required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Ensure table exists (defensive) – real migration provided separately
    await client.query(`
      CREATE TABLE IF NOT EXISTS follow_actions (
        id SERIAL PRIMARY KEY,
        user_fid INTEGER NOT NULL,
        target_fid INTEGER NOT NULL,
        promotion_id INTEGER NULL,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        verified_at TIMESTAMPTZ NULL,
        source TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_follow_per_promo'
        ) THEN
          CREATE UNIQUE INDEX uniq_follow_per_promo
          ON follow_actions (user_fid, target_fid, COALESCE(promotion_id, -1));
        END IF;
      END $$;
    `);

    // Check existing (idempotent)
    const existing = await client.query(
      `SELECT id, verified FROM follow_actions WHERE user_fid = $1 AND target_fid = $2 AND COALESCE(promotion_id, -1) = COALESCE($3, -1)`,
      [user_fid, target_fid, promotion_id]
    );
    if (existing.rows.length) {
      const row = existing.rows[0];
      await client.query('COMMIT');
      return NextResponse.json({ success: true, status: row.verified ? 'already_verified' : 'already_pending' });
    }

    // Try auto-verify
    const { verified, source } = await autoVerifyFollow(user_fid, target_fid);

    // Insert follow action
    const insert = await client.query(
      `INSERT INTO follow_actions (user_fid, target_fid, promotion_id, verified, verified_at, source)
       VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END, $5)
       RETURNING id, verified`,
      [user_fid, target_fid, promotion_id, verified, source]
    );

    // If verified, credit season points (+1)
    if (insert.rows[0].verified) {
      const seasonId = await getActiveSeasonId(client);
      if (seasonId) {
        await client.query(
          `INSERT INTO point_transactions (user_fid, season_id, action_type, points_earned, metadata)
           VALUES ($1, $2, 'follow', 1, $3)`,
          [user_fid, seasonId, JSON.stringify({ target_fid, promotion_id, source, timestamp: new Date().toISOString() })]
        );
        await client.query(
          `INSERT INTO user_season_summary (user_fid, season_id, total_points, last_activity)
           VALUES ($1, $2, 1, NOW())
           ON CONFLICT (user_fid, season_id)
           DO UPDATE SET total_points = user_season_summary.total_points + 1, last_activity = NOW(), updated_at = NOW()`,
          [user_fid, seasonId]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, status: insert.rows[0].verified ? 'verified' : 'pending' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error?.code === '23505') {
      return NextResponse.json({ success: true, status: 'already_recorded' });
    }
    console.error('Follow action error:', error);
    return NextResponse.json({ success: false, error: 'Follow action failed' }, { status: 500 });
  } finally {
    client.release();
  }
}



