// pages/api/webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const event = req.body;
    if (event.event === 'miniapp_added' || event.event === 'notifications_enabled') {
      const { token, url } = event.notificationDetails;
      // Save the token and url to the Neon database
      await pool.query(
        'INSERT INTO notification_tokens (token, url, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (token) DO NOTHING',
        [token, url]
      );
    }
    // Delete if unsubscribed:
    if (event.event === 'miniapp_removed' || event.event === 'notifications_disabled') {
      await pool.query('DELETE FROM notification_tokens WHERE token = $1', [event.notificationDetails?.token]);
    }
    res.status(200).json({ ok: true });
  } else {
    res.status(405).end();
  }
}