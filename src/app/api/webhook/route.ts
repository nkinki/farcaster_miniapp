// ./src/app/api/webhook/route.ts

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

        // JAVÍTÁS ITT: Kezeljük a lehetséges 'null' értéket a '??' operátorral
        if ((result.rowCount ?? 0) > 0) {
            console.log('SUCCESS: Token saved to database:', token);
        } else {
            console.log('INFO: Token already exists in the database or insert failed, not saving again:', token);
        }
        
      } else {
        console.warn(`Event '${event.event}' received, but no 'notificationDetails.token' found.`);
      }
    }

    // Token törlése
    if (event.event === 'miniapp_removed' || event.event === 'notifications_disabled' || event.event === 'frame_removed') {
      let tokenToRemove: string | undefined;

      // 'frame_removed' esetén a payload-ból kell kinyerni a tokent
      if (event.event === 'frame_removed' && event.payload) {
        try {
          const decodedPayload = JSON.parse(Buffer.from(event.payload, 'base64').toString());
          console.log('Decoded frame_removed payload:', decodedPayload);
          if (decodedPayload.token) {
            tokenToRemove = decodedPayload.token;
          }
        } catch (error) {
          console.log('Could not decode or find token in frame_removed payload:', error);
        }
      } else if (event.notificationDetails?.token) {
        // A többi eseménynél a megszokott helyen van
        tokenToRemove = event.notificationDetails.token;
      }

      if (tokenToRemove) {
        console.log(`Attempting to remove token: ${tokenToRemove}`);
        await pool.query('DELETE FROM notification_tokens WHERE token = $1', [tokenToRemove]);
        console.log('Token removal processed from database for:', tokenToRemove);
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('FATAL_WEBHOOK_ERROR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}