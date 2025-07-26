// ./src/app/api/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Ez a sor maradhat, a környezeti változó ellenőrzése hasznos
if (!process.env.DATABASE_URL) {
  console.error("CRITICAL: DATABASE_URL environment variable is not set!");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL beállítás hozzáadása a Neon adatbázishoz való biztonságos kapcsolódáshoz
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function POST(request: NextRequest) {
  console.log('Webhook processing started.');
  try {
    // 1. lépés: Beolvassuk a külső JSON objektumot
    const body = await request.json();

    // 2. lépés: Dekódoljuk a Base64 payload-ot, és JSON-ként értelmezzük
    const event = JSON.parse(Buffer.from(body.payload, 'base64').toString());
    
    console.log('Successfully decoded event payload:', JSON.stringify(event, null, 2));

    const notificationDetails = event.notificationDetails;

    // Most már helyesen fog működni az ellenőrzés
    if (['miniapp_added', 'notifications_enabled', 'frame_added'].includes(event.event)) {
      if (notificationDetails && notificationDetails.token) {
        const { token, url } = notificationDetails;
        console.log(`Token found for event '${event.event}'. Attempting to save token: ${token}`);
        
        const result = await pool.query(
          'INSERT INTO notification_tokens (token, url, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (token) DO NOTHING',
          [token, url]
        );

        if ((result.rowCount ?? 0) > 0) {
            console.log('✅ SUCCESS: Token saved to database:', token);
        } else {
            console.log('ℹ️ INFO: Token already exists in the database or insert failed, not saving again:', token);
        }
        
      } else {
        console.warn(`Event '${event.event}' received, but no 'notificationDetails.token' found.`);
      }
    }

    // Token törlése
    if (['miniapp_removed', 'notifications_disabled', 'frame_removed'].includes(event.event)) {
      // A törlési logika is az 'event' objektumot használja, ami most már helyes
      let tokenToRemove: string | undefined;

      if (event.event === 'frame_removed') {
        // frame_removed esetén a payloadban nincs külön notificationDetails, a token máshol lehet.
        // Ezt a részt a Farcaster dokumentáció alapján kell pontosítani, ha szükséges.
        // Maradjunk az egyszerűbb esettnél:
        console.log("INFO: 'frame_removed' event received. Deletion based on notificationDetails if available.");
      }
      
      if (notificationDetails?.token) {
        tokenToRemove = notificationDetails.token;
      }

      if (tokenToRemove) {
        console.log(`Attempting to remove token: ${tokenToRemove}`);
        await pool.query('DELETE FROM notification_tokens WHERE token = $1', [tokenToRemove]);
        console.log('✅ SUCCESS: Token removal processed from database for:', tokenToRemove);
      } else {
        console.warn(`Event '${event.event}' received, but no token found to remove.`);
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ FATAL_WEBHOOK_ERROR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}