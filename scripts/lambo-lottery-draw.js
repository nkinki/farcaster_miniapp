const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function performLotteryDraw() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🎰 Starting lottery draw...');
    const forceNow = process.env.FORCE_DRAW_NOW === 'true' || process.argv.includes('--force-now');
    
    // Opcionálisan a sorsolás kényszerítése az aktív körök end_time-jának NOW()-ra állításával
    if (forceNow) {
      console.log('⏱️ FORCE NOW enabled – setting end_time to NOW() for active rounds...');
      await client.query(`
        UPDATE lottery_draws
        SET end_time = NOW()
        WHERE status = 'active';
      `);
    }

    // Aktuális, sorsolásra érett kör lekérdezése
    let roundResult = await client.query(`
      SELECT * FROM lottery_draws 
      WHERE status = 'active' AND end_time <= NOW()
      ORDER BY draw_number DESC 
      LIMIT 1
    `);
    
    if (roundResult.rows.length === 0) {
      if (forceNow) {
        console.log('⚙️ No due rounds after force; adjusting active round end_time to NOW()...');
        const upd = await client.query(`
          UPDATE lottery_draws
          SET end_time = NOW()
          WHERE status = 'active'
          RETURNING *;
        `);
        if (upd.rows.length === 0) {
          console.log('🆕 Creating initial active round for immediate draw...');
          await client.query(`
            INSERT INTO lottery_draws (
              draw_number, start_time, end_time, jackpot, status, total_tickets
            ) VALUES (
              1,
              NOW(),
              NOW(),
              1000000,
              'active',
              0
            ) ON CONFLICT (draw_number) DO NOTHING;
          `);
        }
        roundResult = await client.query(`
          SELECT * FROM lottery_draws 
          WHERE status = 'active' AND end_time <= NOW()
          ORDER BY draw_number DESC 
          LIMIT 1
        `);
      }
      if (roundResult.rows.length === 0) {
        console.log('ℹ️ No rounds ready for drawing');
        await client.query('ROLLBACK');
        return;
      }
    }
    
    const round = roundResult.rows[0];
    console.log(`🎯 Drawing for Round #${round.draw_number}`);
    
    // Összes szelvény lekérdezése az adott körhöz
    const ticketsResult = await client.query(`
      SELECT * FROM lottery_tickets 
      WHERE draw_id = $1
    `, [round.id]);
    
    const totalTicketsSold = ticketsResult.rows.length;
    console.log(`🎫 Total tickets sold in this round: ${totalTicketsSold}`);

    // --- JAVÍTOTT LOGIKA KEZDETE ---

    // 1. Nyerőszám sorsolása 1 és 100 között
    const winningNumber = Math.floor(Math.random() * 100) + 1;
    console.log(`🎲 The winning number is: ${winningNumber}`);

    // 2. Nyertes(ek) keresése a megvásárolt szelvények között
    const winners = ticketsResult.rows.filter(ticket => ticket.number === winningNumber);

    let nextPrizePool;
    const ticketSales = totalTicketsSold * 100000; // 100k per ticket

    if (winners.length > 0) {
      // 3. Van nyertes
      console.log(`🏆 Winner(s) found! FID(s): ${winners.map(w => w.player_fid).join(', ')}`);
      console.log(`💰 Prize: ${round.jackpot.toLocaleString()} CHESS tokens`);

      // A következő kör nyereményalapja: alap 1M + az eladások 70%-a
      nextPrizePool = 1000000 + Math.floor(ticketSales * 0.7);
      
    } else {
      // 4. Nincs nyertes
      console.log(`❌ No winner for number ${winningNumber}. Jackpot rolls over!`);

      // A következő kör nyereményalapja: jelenlegi jackpot + az eladások 70%-a
      nextPrizePool = round.jackpot + Math.floor(ticketSales * 0.7);
    }

    // Aktuális kör frissítése a nyerőszámmal és lezárása
    await client.query(`
      UPDATE lottery_draws 
      SET status = 'completed', 
          winning_number = $1,
          total_tickets = $2
      WHERE id = $3
    `, [winningNumber, totalTicketsSold, round.id]);
    
    // Következő kör létrehozása
    await createNextRound(client, nextPrizePool);
    
    // --- JAVÍTOTT LOGIKA VÉGE ---

    await client.query('COMMIT');
    
    console.log(`✅ Lottery draw completed!`);
    console.log(`🎯 Next round prize pool: ${nextPrizePool.toLocaleString()} CHESS tokens`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during lottery draw:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function createNextRound(client, prizePool) {
  const nextRoundNumberResult = await client.query(`
    SELECT COALESCE(MAX(draw_number), 0) + 1 as next_round
    FROM lottery_draws
  `);
  
  const roundNumber = nextRoundNumberResult.rows[0].next_round;
  
  await client.query(`
    INSERT INTO lottery_draws (
      draw_number, 
      start_time, 
      end_time, 
      jackpot, 
      status,
      total_tickets
    ) VALUES (
      $1,
      NOW(),
      NOW() + INTERVAL '1 day',
      $2,
      'active',
      0
    )
  `, [roundNumber, prizePool]);
  
  console.log(`🆕 Created Round #${roundNumber} with prize pool: ${prizePool.toLocaleString()} CHESS`);
}

// A sorsolás futtatása
if (require.main === module) {
  performLotteryDraw()
    .then(() => {
      console.log('🎰 Lottery draw script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Lottery draw script failed:', error);
      process.exit(1);
    });
}

module.exports = { performLotteryDraw };