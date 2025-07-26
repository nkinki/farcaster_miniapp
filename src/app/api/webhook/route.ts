import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Ellenőrizzük, hogy a környezeti változó be van-e töltve
if (!process.env.DATABASE_URL) {
  console.error("CRITICAL: DATABASE_URL environment variable is not set!");
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  console.log('Webhook processing started.');
  try {
    const event = await request.json();
    // Logoljuk a teljes bejövő eseményt a hibakereséshez
    console.log('Received Farcaster webhook event:', JSON.stringify(event, null, 2));

    const notificationDetails = event.notificationDetails;

    // Token hozzáadása
    if (['miniapp_added', 'notifications_enabled', 'frame_added'].includes(event.event)) {
      if (notificationDetails && notificationDetails.token) {
        const { token, url } = notificationDetails;
        console.log(`Token found for event '${event.event}'. Attempting to save token: ${token}`);
        
        const result = await pool.query(
          'INSERT INTO notification_tokens (token, url, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (token) DO NOTHING',
          [token, url]
        );

        // Logoljuk, hogy a lekérdezés sikeres volt-e és hány sort érintett
        if (result.rowCount > 0) {
            console.log('SUCCESS: Token saved to database:', token);
        } else {
            console.log('INFO: Token already exists in the database, not saving again:', token);
        }
        
      } else {
        console.warn(`Event '${event.event}' received, but no 'notificationDetails.token' found.`);
      }
    }

    // Token törlése... (a többi kód változatlan)

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('FATAL_WEBHOOK_ERROR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}