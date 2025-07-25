import { Pool } from 'pg';
import fetch from 'node-fetch';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function sendNotifications() {
  // Lekérdezi az összes notification tokent és url-t
  const { rows } = await pool.query('SELECT token, url FROM notification_tokens');
  if (!rows.length) {
    console.log('Nincs token, nincs értesítés.');
    return;
  }

  // Csoportosítás url szerint (ha többféle url lenne)
  const urlMap: { [url: string]: string[] } = {};
  for (const row of rows) {
    if (!urlMap[row.url]) urlMap[row.url] = [];
    urlMap[row.url].push(row.token);
  }

  // Küldés minden url-csoportnak
  for (const [url, tokens] of Object.entries(urlMap)) {
    // Max 100 token/request
    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: `daily-toplist-${new Date().toISOString().slice(0, 10)}`,
          title: 'Biggest Gainer Today!',
          body: 'Check out which miniapp had the highest growth today.',
          targetUrl: 'https://farc-nu.vercel.app',
          tokens: batch
        })
      });
      console.log(`Küldve ${batch.length} tokenre, válasz:`, await res.text());
    }
  }
  await pool.end();
}

sendNotifications().catch(console.error);