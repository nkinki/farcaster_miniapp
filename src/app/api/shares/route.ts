import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { promotionId, sharerFid, sharerUsername, castHash } = body;
  
  if (!promotionId || !sharerFid || !sharerUsername || !castHash) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const [promo] = await sql`
      SELECT reward_per_share, remaining_budget, status 
      FROM promotions WHERE id = ${promotionId}
    `;

    if (!promo) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    if (promo.status !== 'active') {
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    }
    if (promo.remaining_budget < promo.reward_per_share) {
      await sql`UPDATE promotions SET status = 'completed' WHERE id = ${promotionId}`;
      return NextResponse.json({ error: 'Insufficient budget for this share' }, { status: 400 });
    }

    // Record the share
    await sql`
      INSERT INTO shares (promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount)
      VALUES (${promotionId}, ${sharerFid}, ${sharerUsername}, ${castHash}, ${promo.reward_per_share})
    `;

    // Update promotion
    await sql`
      UPDATE promotions
      SET 
        shares_count = shares_count + 1, 
        remaining_budget = remaining_budget - ${promo.reward_per_share}
      WHERE id = ${promotionId}
    `;

    return NextResponse.json({ success: true, message: "Share recorded successfully" }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in POST /api/shares:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}