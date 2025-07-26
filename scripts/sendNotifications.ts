import { Pool } from 'pg';
import fetch from 'node-fetch';

async function sendNotifications() {
  console.log("Szkript elindítva. Adatbázis-kapcsolat létrehozása...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // 1. LÉPÉS: Értesítendő felhasználók lekérdezése
    console.log("Tokenek lekérdezése az adatbázisból...");
    const { rows: tokenRows } = await pool.query('SELECT token, url FROM notification_tokens');
    
    if (!tokenRows.length) {
      console.log('Nincs token az adatbázisban. A szkript leáll.');
      return; // A finally blokk le fog futni
    }
    console.log(`${tokenRows.length} db tokent találtam.`);

    // 2. LÉPÉS: A nap nyertesének lekérdezése
    console.log("A nap nyertesének lekérdezése...");
    let gainer: { name: string; change: number } | null = null;
    
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

    if (gainerResult.rows.length > 0) {
      const winnerRow = gainerResult.rows[0];
      gainer = { name: winnerRow.name, change: winnerRow.rank_24h_change };
      console.log(`A mai nyertes: ${gainer.name} (+${gainer.change})`);
    } else {
      console.log("Nem található mai nyertes (vagy nincs friss statisztika).");
    }

    // 3. LÉPÉS: Az értesítés szövegének dinamikus összeállítása
    console.log("Értesítési üzenet összeállítása...");
    let notificationTitle = "Friss AppRank Toplista!";
    let notificationBody = "Nézd meg a legfrissebb toplistát és a napi változásokat!";

    if (gainer) {
      notificationTitle = `Rakétázik a(z) ${gainer.name}!`;
      notificationBody = `Ma (+${gainer.change}) helyet ugrott előre a toplistán! Nézd meg te is!`;
    }
    
    // 4. LÉPÉS: Az értesítések kiküldése
    console.log("Értesítések előkészítése a küldésre...");
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
        
        console.log(`Értesítés küldése ${batch.length} tokenre a(z) ${url} címre...`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationPayload)
        });
        console.log(`Küldés befejezve. Válasz:`, await res.text());
      }
    }
  } catch (error) {
    console.error("❌ Hiba történt a szkript futása közben:", error);
  } finally {
    // 5. LÉPÉS: Adatbázis-kapcsolat lezárása
    console.log("Adatbázis-kapcsolat lezárása.");
    await pool.end();
  }
}

// A szkript futtatása
sendNotifications();