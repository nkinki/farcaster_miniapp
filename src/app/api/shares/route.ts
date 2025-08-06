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

  try {
    const result = await sql.transaction(async (tx) => {
      const [promo] = await tx`
        SELECT reward_per_share, remaining_budget, status 
        FROM promotions WHERE id = ${promotionId} FOR UPDATE
      `;

      if (!promo) throw new Error('Promotion not found');
      if (promo.status !== 'active') throw new Error('Campaign is not active');
      if (promo.remaining_budget < promo.reward_per_share) {
        // Még ha a keret kimerül is, rögzítjük az utolsó megosztást, ha van rá keret.
        // Ha a keret már a hívás előtt kimerült, akkor dobunk hibát.
        // A biztonság kedvéért a státuszt a végén frissítjük.
        throw new Error('Insufficient budget for this share');
      }

      // JAVÍTÁS: A lekérdezéseket egy `Promise.all`-ba tesszük, hogy a driver
      // helyesen tudja őket egyetlen tranzakcióként kezelni.
      const [newShare, updatedPromotion] = await Promise.all([
        tx`
          INSERT INTO shares (promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount)
          VALUES (${promotionId}, ${sharerFid}, ${sharerUsername}, ${castHash}, ${promo.reward_per_share})
          RETURNING id, created_at
        `,
        tx`
          UPDATE promotions
          SET 
            shares_count = shares_count + 1, 
            remaining_budget = remaining_budget - ${promo.reward_per_share}
          WHERE id = ${promotionId}
          RETURNING shares_count, remaining_budget
        `
      ]);

      // Ellenőrizzük, hogy a frissítés után kimerült-e a keret
      if (updatedPromotion[0].remaining_budget < promo.reward_per_share) {
        await tx`UPDATE promotions SET status = 'completed' WHERE id = ${promotionId}`;
      }

      return {
        shareId: newShare[0].id,
        shareCreatedAt: newShare[0].created_at,
        newSharesCount: updatedPromotion[0].shares_count,
        remainingBudget: updatedPromotion[0].remaining_budget
      };
    });

    return NextResponse.json({ 
        success: true, 
        message: `Share recorded successfully`, 
        data: result 
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in POST /api/shares:', error.message);
    if (['Promotion not found', 'Campaign is not active', 'Insufficient budget for this share'].includes(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}