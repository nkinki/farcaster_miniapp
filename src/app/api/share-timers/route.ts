import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL is not set');
}
const sql = neon(process.env.NEON_DB_URL);

// A cooldown periódust egy központi helyen definiáljuk órában
const COOLDOWN_HOURS = 48;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fidString = searchParams.get('fid');

    if (!fidString) {
      return NextResponse.json({ error: 'Farcaster ID (fid) is required' }, { status: 400 });
    }
    const fid = parseInt(fidString, 10);
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid Farcaster ID' }, { status: 400 });
    }

    // 1. LÉPÉS: Lekérdezzük az ÖSSZES aktív promóció ID-ját.
    // Ez a lista a "forrása az igazságnak", hogy miről kell állapotot adnunk.
    const activePromos = await sql`
      SELECT id FROM promotions WHERE status = 'active';
    `;
    const activePromoIds = activePromos.map(p => p.id);

    if (activePromoIds.length === 0) {
      // Ha nincs egyetlen aktív promóció sem, üres listát küldünk vissza.
      return NextResponse.json({ timers: [] }, { status: 200 });
    }

    // 2. LÉPÉS: Lekérdezzük a felhasználó legutóbbi megosztásait CSAK az aktív promóciókhoz.
    const recentShares = await sql`
      SELECT 
        promotion_id, 
        MAX(created_at) as last_shared_at
      FROM shares
      WHERE 
        sharer_fid = ${fid} AND 
        promotion_id IN (${activePromoIds})
      GROUP BY promotion_id;
    `;

    // 3. LÉPÉS: A könnyebb és gyorsabb feldolgozásért a megosztásokat egy Map-be tesszük.
    const sharesMap = new Map(recentShares.map(share => [
      share.promotion_id, 
      new Date(share.last_shared_at as string)
    ]));

    const now = new Date();
    
    // 4. LÉPÉS: Végigmegyünk az összes aktív promóción (nem csak a megosztottakon!),
    // és mindegyikhez generálunk egy timer állapotot.
    const timers = activePromoIds.map(promoId => {
      const lastSharedDate = sharesMap.get(promoId);

      // Ha a felhasználó még soha nem osztotta meg ezt az aktív promóciót...
      if (!lastSharedDate) {
        return {
          promotionId: promoId,
          canShare: true,      // ...akkor természetesen megoszthatja.
          timeRemaining: 0,
        };
      }

      // Ha már megosztotta, akkor a számítás a régi.
      const hoursElapsed = (now.getTime() - lastSharedDate.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = COOLDOWN_HOURS - hoursElapsed;

      return {
        promotionId: promoId,
        canShare: hoursRemaining <= 0,
        timeRemaining: hoursRemaining > 0 ? hoursRemaining : 0,
      };
    });

    return NextResponse.json({ timers }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in GET /api/share-timers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}