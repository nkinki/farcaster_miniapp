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

    // Lekérdezzük a legutóbbi megosztás időpontját minden promócióhoz, amit az adott felhasználó már megosztott.
    // A `MAX(created_at)` biztosítja, hogy ha valamiért többször is megosztotta, csak a legutolsót vesszük figyelembe.
    const recentShares = await sql`
      SELECT 
        promotion_id, 
        MAX(created_at) as last_shared_at
      FROM shares
      WHERE sharer_fid = ${fid}
      GROUP BY promotion_id;
    `;

    const now = new Date();
    
    // Feldolgozzuk a lekérdezés eredményét, és kiszámoljuk az időzítőket
    const timers = recentShares.map(share => {
      const lastSharedDate = new Date(share.last_shared_at as string);
      
      // Kiszámoljuk, hány óra telt el a megosztás óta
      const hoursElapsed = (now.getTime() - lastSharedDate.getTime()) / (1000 * 60 * 60);
      
      // Kiszámoljuk, hány óra van még hátra a 48 órás limitből
      const hoursRemaining = COOLDOWN_HOURS - hoursElapsed;

      return {
        promotionId: share.promotion_id,
        canShare: hoursRemaining <= 0,
        // Biztosítjuk, hogy a hátralévő idő soha ne legyen negatív
        timeRemaining: hoursRemaining > 0 ? hoursRemaining : 0,
      };
    });

    return NextResponse.json({ timers }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in GET /api/share-timers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}