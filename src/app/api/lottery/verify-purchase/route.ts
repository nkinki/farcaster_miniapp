// FÁJL: src/app/api/lottery/verify-purchase/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { Pool } from 'pg';
import { LOTTO_PAYMENT_ROUTER_ADDRESS } from '@/abis/LottoPaymentRouter';

// Adatbázis kapcsolat inicializálása
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Szerver-oldali viem kliens a blokklánc ellenőrzéséhez
// FONTOS: A BASE_RPC_URL környezeti változónak be kell lennie állítva a Vercelen!
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL),
});

// Mivel a `body`-t használjuk, a POST metódus a helyes
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { 
      txHash, 
      fid, 
      round_id, 
      ticket_numbers, 
      playerAddress 
    } = await request.json();

    if (!txHash || !fid || !round_id || !Array.isArray(ticket_numbers) || !playerAddress) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // --- 1. SZERVER-OLDALI TRANZAKCIÓ ELLENŐRZÉS ---
    console.log(`[Verifier] Verifying txHash: ${txHash}`);
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (!receipt) {
      return NextResponse.json({ error: 'Transaction receipt not found. It might still be processing.' }, { status: 404 });
    }
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'On-chain transaction failed.', details: `Status: ${receipt.status}` }, { status: 400 });
    }
    if (receipt.to?.toLowerCase() !== LOTTO_PAYMENT_ROUTER_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: 'Transaction was sent to the wrong contract address.' }, { status: 400 });
    }
    if (receipt.from?.toLowerCase() !== playerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Transaction sender does not match the player address.' }, { status: 403 });
    }

    console.log(`[Verifier] Verification successful for txHash: ${txHash}`);

    // --- 2. ADATBÁZISBA ÍRÁS ---
    await client.query('BEGIN');

    // Ellenőrizzük, hogy ezt a tranzakciót nem dolgoztuk-e már fel (duplikáció elkerülése)
    const existingTx = await client.query('SELECT id FROM lottery_tickets WHERE transaction_hash = $1', [txHash]);
    if (existingTx.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log(`[Verifier] Transaction ${txHash} already processed.`);
      // Sikeres választ adunk, mert a jegyek már rögzítve vannak
      return NextResponse.json({ success: true, message: 'Purchase was already registered.' });
    }

    console.log(`[Verifier] Registering ${ticket_numbers.length} tickets for round ${round_id}`);
    for (const number of ticket_numbers) {
      await client.query(
        `INSERT INTO lottery_tickets (draw_id, player_fid, ticket_number, transaction_hash, player_address, purchased_at, purchase_price)
         VALUES ($1, $2, $3, $4, $5, NOW(), 100000)`,
        [round_id, fid, number, txHash, playerAddress]
      );
    }
    
    await client.query('COMMIT');
    console.log(`[Verifier] Successfully committed tickets for txHash: ${txHash}`);
    
    return NextResponse.json({ success: true, message: 'Tickets successfully verified and registered.' });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[Verifier] API Error:', error);
    return NextResponse.json({ error: 'Internal server error during transaction verification.', details: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}