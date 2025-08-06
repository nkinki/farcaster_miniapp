// FÁJL: /src/app/api/shares/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { promotionId, sharerFid, sharerUsername, castHash } = body;
  
  if (!promotionId || !sharerFid || !sharerUsername || !castHash) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // JAVÍTÁS: Manuális tranzakciókezelést használunk a típus-hiba elkerülésére
  try {
    // Tranzakció indítása
    await sql`BEGIN`;

    const [promo] = await sql`
      SELECT reward_per_share, remaining_budget, status 
      FROM promotions WHERE id = ${promotionId} FOR UPDATE
    `;

    if (!promo) {
      await sql`ROLLBACK`; // Visszavonjuk a tranzakciót hiba esetén
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    if (promo.status !== 'active') {
      await sql`ROLLBACK`;
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    }
    if (promo.remaining_budget < promo.reward_per_share) {
      await sql`UPDATE promotions SET status = 'completed' WHERE id = ${promotionId}`;
      await sql`COMMIT`; // Véglegesítjük a státusz frissítést
      return NextResponse.json({ error: 'Insufficient budget for this share' }, { status: 400 });
    }

    // Új megosztás rögzítése
    await sql`
      INSERT INTO shares (promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount)
      VALUES (${promotionId}, ${sharerFid}, ${sharerUsername}, ${castHash}, ${promo.reward_per_share})
    `;

    // Promóció frissítése
    await sql`
      UPDATE promotions
      SET 
        shares_count = shares_count + 1, 
        remaining_budget = remaining_budget - ${promo.reward_per_share}
      WHERE id = ${promotionId}
    `;

    // Véglegesítjük a sikeres műveleteket
    await sql`COMMIT`;

    return NextResponse.json({ success: true, message: "Share recorded successfully" }, { status: 200 });

  } catch (error: any) {
    // Ha bármilyen hiba történik a `try` blokkon belül, visszavonjuk a tranzakciót
    await sql`ROLLBACK`;
    console.error('API Error in POST /api/shares (Transaction Rolled Back):', error.message);
    return NextResponse.json({ error: 'Internal server error during transaction' }, { status: 500 });
  }
}