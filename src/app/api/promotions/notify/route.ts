// FÁJL: /src/app/api/promotions/notify/route.ts
// Új promotion értesítések kezelése

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Adatbázis kapcsolat ellenőrzése
const dbUrl = process.env.NEON_DB_URL;
if (!dbUrl) {
  console.warn('⚠️ NEON_DB_URL not found, using mock data for testing');
}

// Csak akkor inicializáljuk a neon kapcsolatot, ha van valós DB URL
const sql = dbUrl && dbUrl.startsWith('postgresql://') ? neon(dbUrl) : null;

// Új promotionök lekérése az utolsó ellenőrzés óta
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const since = searchParams.get('since'); // ISO timestamp
    
    // Ha nincs valós DB kapcsolat, mock adatokat adunk vissza
    if (!sql) {
      console.log('🧪 Using mock data - no real database connection');
      
      const mockPromotions = [
        {
          id: 'mock-1',
          fid: 12345,
          username: 'mockuser1',
          display_name: 'Mock User 1',
          cast_url: 'https://warpcast.com/mockuser1/0x123',
          share_text: 'Mock promotion 1',
          reward_per_share: 15,
          total_budget: 1500,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];
      
      return NextResponse.json({ 
        success: true,
        count: mockPromotions.length,
        promotions: mockPromotions,
        timestamp: new Date().toISOString(),
        mock: true
      }, { status: 200 });
    }
    
    let query;
    if (since) {
      // Csak az utolsó ellenőrzés óta létrehozott promotionök
      query = sql`
        SELECT 
          id, fid, username, display_name, cast_url, share_text,
          reward_per_share, total_budget, status, created_at
        FROM promotions 
        WHERE created_at > ${since}
        ORDER BY created_at DESC;
      `;
    } else {
      // Utolsó 24 óra promotionjai
      query = sql`
        SELECT 
          id, fid, username, display_name, cast_url, share_text,
          reward_per_share, total_budget, status, created_at
        FROM promotions 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC;
      `;
    }
    
    const newPromotions = await query;
    
    return NextResponse.json({ 
      success: true,
      count: newPromotions.length,
      promotions: newPromotions,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('API Error in GET /api/promotions/notify:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch new promotions',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Promotion értesítés küldése (webhook trigger)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotionId, notificationType = 'new_promotion' } = body;
    
    if (!promotionId) {
      return NextResponse.json({ error: 'Missing promotionId' }, { status: 400 });
    }
    
    // Ha nincs valós DB kapcsolat, mock választ adunk
    if (!sql) {
      console.log('🧪 Mock notification trigger:', { promotionId, notificationType });
      
      return NextResponse.json({ 
        success: true,
        message: 'Mock notification triggered',
        promotion: {
          id: promotionId,
          username: 'mockuser',
          budget: 1000,
          rewardPerShare: 10
        },
        mock: true
      }, { status: 200 });
    }
    
    // Promotion részletek lekérése
    const [promotion] = await sql`
      SELECT 
        id, fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, status, created_at
      FROM promotions 
      WHERE id = ${promotionId};
    `;
    
    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    
    // Itt küldhetnénk email értesítést vagy Farcaster cast-et
    console.log(`🚀 NEW PROMOTION ALERT:`, {
      id: promotion.id,
      user: `@${promotion.username}`,
      budget: `${promotion.total_budget} CHESS`,
      rewardPerShare: `${promotion.reward_per_share} CHESS`,
      created: promotion.created_at
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Notification triggered',
      promotion: {
        id: promotion.id,
        username: promotion.username,
        budget: promotion.total_budget,
        rewardPerShare: promotion.reward_per_share
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('API Error in POST /api/promotions/notify:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification' 
    }, { status: 500 });
  }
}