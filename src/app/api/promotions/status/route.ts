import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotionId, status } = body;
    
    if (!promotionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['active', 'paused'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be active or paused' }, { status: 400 });
    }

    // Ellenőrizzük, hogy létezik-e a promotion
    const [promotion] = await sql`
      SELECT id, status, remaining_budget, reward_per_share 
      FROM promotions 
      WHERE id = ${promotionId}
    `;

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    // Ha active-ra akarjuk állítani, ellenőrizzük hogy van-e elég budget
    if (status === 'active') {
      if (promotion.remaining_budget < promotion.reward_per_share) {
        return NextResponse.json({ 
          error: 'Cannot activate campaign: insufficient budget for at least one share' 
        }, { status: 400 });
      }
    }

    // Frissítjük a státuszt
    await sql`
      UPDATE promotions 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${promotionId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: `Campaign ${status === 'active' ? 'started' : 'paused'} successfully` 
    });

  } catch (error: any) {
    console.error('API Error in PUT /api/promotions/status:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}