import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  console.log('=== WEBHOOK STARTED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const event = await request.json();
    console.log('=== RAW WEBHOOK EVENT ===');
    console.log('Farcaster webhook event:', JSON.stringify(event, null, 2));
    console.log('Event type:', event.event);
    console.log('Has notificationDetails:', !!event.notificationDetails);
    console.log('Has payload:', !!event.payload);
    
    if (event.event === 'miniapp_added' || event.event === 'notifications_enabled' || event.event === 'frame_added') {
      console.log('=== PROCESSING ADD EVENT ===');
      console.log('Processing add event...');
      console.log('Notification details:', JSON.stringify(event.notificationDetails, null, 2));
      
      if (event.notificationDetails && event.notificationDetails.token) {
        const { token, url } = event.notificationDetails;
        console.log('=== SAVING TOKEN ===');
        console.log('Token to save:', token);
        console.log('URL to save:', url);
        
        try {
          // Mentsd el a tokent és az url-t a Neon adatbázisba
          const result = await pool.query(
            'INSERT INTO notification_tokens (token, url, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (token) DO NOTHING',
            [token, url]
          );
          console.log('=== DATABASE RESULT ===');
          console.log('Database query result:', result);
          console.log('Token saved to database successfully:', token);
        } catch (dbError) {
          console.error('=== DATABASE ERROR ===');
          console.error('Database error:', dbError);
          throw dbError;
        }
      } else {
        console.log('=== NO TOKEN FOUND ===');
        console.log('No notification details or token found in add event');
        console.log('notificationDetails:', event.notificationDetails);
      }
    }
    
    // Törlés, ha leiratkozik:
    if (event.event === 'miniapp_removed' || event.event === 'notifications_disabled' || event.event === 'frame_removed') {
      console.log('=== PROCESSING REMOVE EVENT ===');
      console.log('Processing remove event...');
      
      // frame_removed eseményekben nincs notificationDetails, ezért a payload-ból kell kinyerni
      if (event.event === 'frame_removed' && event.payload) {
        console.log('=== DECODING FRAME_REMOVED PAYLOAD ===');
        try {
          const decodedPayload = JSON.parse(Buffer.from(event.payload, 'base64').toString());
          console.log('Decoded frame_removed payload:', JSON.stringify(decodedPayload, null, 2));
          // Ha van token a payload-ban, töröljük
          if (decodedPayload.token) {
            console.log('=== REMOVING TOKEN ===');
            console.log('Token to remove:', decodedPayload.token);
            const result = await pool.query('DELETE FROM notification_tokens WHERE token = $1', [decodedPayload.token]);
            console.log('Delete result:', result);
            console.log('Token removed from database:', decodedPayload.token);
          } else {
            console.log('No token found in decoded payload');
          }
        } catch (error) {
          console.log('=== PAYLOAD DECODE ERROR ===');
          console.log('Could not decode frame_removed payload:', error);
        }
      } else if (event.notificationDetails?.token) {
        console.log('=== REMOVING TOKEN (OLD FORMAT) ===');
        console.log('Token to remove:', event.notificationDetails.token);
        const result = await pool.query('DELETE FROM notification_tokens WHERE token = $1', [event.notificationDetails.token]);
        console.log('Delete result:', result);
        console.log('Token removed from database:', event.notificationDetails.token);
      } else {
        console.log('=== NO TOKEN FOUND FOR REMOVAL ===');
        console.log('No token found in remove event');
        console.log('notificationDetails:', event.notificationDetails);
        console.log('payload:', event.payload);
      }
    }
    
    console.log('=== WEBHOOK COMPLETED SUCCESSFULLY ===');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Webhook error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}