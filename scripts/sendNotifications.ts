import { Pool } from 'pg';
import fetch from 'node-fetch';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function sendNotifications() {
  // 1. LÉPÉS: Értesítendő felhasználók lekérdezése
  const { rows: tokenRows } = await pool.query('SELECT token, url FROM notification_tokens');
  if (!tokenRows.length) {
    console.log('Nincs token, nincs értesítés.');
    await pool.end();
    return;
  }
  console.log(`${tokenRows.length} db tokent találtam az adatbázisban.`);

  // 2. LÉPÉS: A nap nyertesének lekérdezése az adatbázisból JOIN-nal
  let gainer: { name: string; change: number } | null = null;
  
  try {
    const gainerResult = await pool.query(
      `SELECT
          m.name,
          s.rank_24h_change
        FROM miniapp_statistics AS s
        JOIN miniapps AS m ON s.miniapp_id = m.domain
        WHERE s.rank_24h_change > 0 AND s.stat_date = CURRENT_DATE
        ORDER BY s.rank_24h_change DESC
        LIMIT 1`
    );

    if (gainerResult.rows) {
      gainer = { name: gainerResult.rows.name, change: gainerResult.rows.rank_24h_change };
      console.log(`A nap nyertese: ${gainer.name} (+${gainer.change})`);
    } else {
      console.log("Nem található mai nyertes (nincs pozitív 24h változás).");
    }
  } catch (error) {
    console.error("Hiba a statisztikák lekérdezése közben:", error);
    await pool.end();
    return;
  }

  // 3. LÉPÉS: Az értesítés szövegének dinamikus összeállítása
  let notificationTitle = "Friss AppRank Toplista!";
  let notificationBody = "Nézd meg a legfrissebb toplistát és a napi változásokat!";

  if (gainer) {
    notificationTitle = `Rakétázik a(z) ${gainer.name}!`;
    notificationBody = `Ma (+${gainer.change}) helyet ugrott előre a toplistán! Nézd meg te is!`;
  }
  
  // 4. LÉPÉS: Az értesítések kiküldése
  const urlMap: { [url: string]: string[] } = {};
  for (const row of tokenRows) {
    if (!urlMap[row.url]) urlMap[row.url] = [];
    urlMap[row.url].push(row.token);
  }

  for (const [url, tokens] of Object.entries(urlMap)) {
    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100);
      
      const notificationPayload = {
        notificationId: `daily-toplist-${new Date().toISOString().slice(0, 10)}`,
        title: notificationTitle,
        body: notificationBody,
        targetUrl: 'https://farc-nu.vercel.app',
        tokens: batch
      };
      
      console.log("Értesítés küldése a következő tartalommal:", JSON.stringify(notificationPayload, null, 2));

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload)
      });
      console.log(`Küldve ${batch.length} tokenre, válasz:`, await res.text());
    }
  }

  // 5. LÉPÉS: Adatbázis-kapcsolat lezárása
  await pool.end();
}

// A szkript futtatása
sendNotifications().catch(console.error);