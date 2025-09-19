import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, fallback } from 'viem';
import { base } from 'viem/chains';
import { Pool } from 'pg';
import { LOTTO_PAYMENT_ROUTER_ADDRESS } from '@/abis/LottoPaymentRouter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const publicClient = createPublicClient({
  chain: base,
  transport: fallback([
    http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
    http('https://base.blockpi.network/v1/rpc/public'),
    http('https://base.llamarpc.com'),
    http('https://base-mainnet.public.blastapi.io')
  ]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      playerAddress, 
      hoursBack = 24, 
      adminKey 
    } = body;

    // Admin key check
    if (adminKey !== 'admin-key-123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!playerAddress) {
      return NextResponse.json({ error: 'playerAddress is required' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      // Get current active round
      const roundResult = await client.query(`
        SELECT id FROM lottery_draws 
        WHERE status = 'active' 
        ORDER BY draw_number DESC 
        LIMIT 1
      `);
      
      if (roundResult.rows.length === 0) {
        return NextResponse.json({ error: 'No active round found' }, { status: 400 });
      }
      
      const activeRoundId = roundResult.rows[0].id;
      
      // Get block range for the last N hours
      const currentBlock = await publicClient.getBlockNumber();
      const blocksPerHour = 3600; // Base ~1s block time
      const fromBlock = currentBlock - BigInt(Math.floor(hoursBack * blocksPerHour));
      
      console.log(`[Reconcile] Scanning blocks ${fromBlock} to ${currentBlock} for ${playerAddress}`);
      
      // Get all TicketPurchased events for this player
      const logs = await publicClient.getLogs({
        address: LOTTO_PAYMENT_ROUTER_ADDRESS,
        event: parseAbiItem('event TicketPurchased(address indexed player, uint256 indexed ticketNumber, uint256 amount)'),
        args: {
          player: playerAddress as `0x${string}`
        },
        fromBlock,
        toBlock: currentBlock
      });
      
      console.log(`[Reconcile] Found ${logs.length} TicketPurchased events`);
      
      const reconciledTickets: Array<{ number: number; txHash: string }> = [];
      const alreadyRegistered: Array<{ number: number; txHash: string }> = [];
      
      for (const log of logs) {
        const ticketNumber = Number(log.args.ticketNumber);
        const txHash = log.transactionHash;
        
        // Check if this ticket is already in DB
        const existingTicket = await client.query(`
          SELECT id FROM lottery_tickets 
          WHERE draw_id = $1 AND player_fid = (
            SELECT fid FROM users WHERE wallet_address = $2
          ) AND "number" = $3 AND transaction_hash = $4
        `, [activeRoundId, playerAddress, ticketNumber, txHash]);
        
        if (existingTicket.rows.length > 0) {
          alreadyRegistered.push({ number: ticketNumber, txHash });
          continue;
        }
        
        // Get user FID from wallet address
        const userResult = await client.query(`
          SELECT fid FROM users WHERE wallet_address = $1
        `, [playerAddress]);
        
        if (userResult.rows.length === 0) {
          console.log(`[Reconcile] No FID found for wallet ${playerAddress}, skipping ticket ${ticketNumber}`);
          continue;
        }
        
        const userFid = userResult.rows[0].fid;
        
        // Check 10-ticket limit
        const userTicketCount = await client.query(`
          SELECT COUNT(*) as count FROM lottery_tickets 
          WHERE draw_id = $1 AND player_fid = $2
        `, [activeRoundId, userFid]);
        
        const currentCount = parseInt(userTicketCount.rows[0].count);
        if (currentCount >= 10) {
          console.log(`[Reconcile] User ${userFid} already has 10 tickets, skipping ${ticketNumber}`);
          continue;
        }
        
        // Insert the missing ticket
        await client.query(`
          INSERT INTO lottery_tickets (draw_id, player_fid, "number", transaction_hash, player_address, purchased_at, purchase_price)
          VALUES ($1, $2, $3, $4, $5, NOW(), 100000)
        `, [activeRoundId, userFid, ticketNumber, txHash, playerAddress]);
        
        reconciledTickets.push({ number: ticketNumber, txHash });
        console.log(`[Reconcile] Registered missing ticket ${ticketNumber} for FID ${userFid}`);
      }
      
      return NextResponse.json({
        success: true,
        message: `Reconciliation complete`,
        stats: {
          eventsFound: logs.length,
          reconciledTickets: reconciledTickets.length,
          alreadyRegistered: alreadyRegistered.length,
          activeRoundId
        },
        reconciledTickets,
        alreadyRegistered
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('[Reconcile] Error:', error);
    return NextResponse.json({ 
      error: 'Reconciliation failed', 
      details: error.message 
    }, { status: 500 });
  }
}
