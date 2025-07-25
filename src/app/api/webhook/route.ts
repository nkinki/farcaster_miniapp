import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    console.log('Farcaster webhook event:', event);
    
    if (event.event === 'miniapp_added' || event.event === 'notifications_enabled' || event.event === 'frame_added') {
      const { token, url } = event.notificationDetails;
      // Mentsd el a tokent és az url-t a Neon adatbázisba
      await pool.query(
        'INSERT INTO notification_tokens (token, url, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (token) DO NOTHING',
        [token, url]
      );
      console.log('Token saved to database:', token);
    }
    // Törlés, ha leiratkozik:
    if (event.event === 'miniapp_removed' || event.event === 'notifications_disabled' || event.event === 'frame_removed') {
      await pool.query('DELETE FROM notification_tokens WHERE token = $1', [event.notificationDetails?.token]);
      console.log('Token removed from database:', event.notificationDetails?.token);
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}