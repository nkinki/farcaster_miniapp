import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('🎰 Setting up test lottery...');
    
    // 1. Create a test lottery round
    const roundResult = await sql`
      INSERT INTO lottery_draws (
        draw_number, 
        start_time, 
        end_time, 
        jackpot, 
        status
      ) VALUES (
        999, 
        NOW() - INTERVAL '1 hour', 
        NOW() - INTERVAL '30 minutes', 
        1000000, 
        'active'
      )
      RETURNING *
    `;
    
    const testRound = roundResult[0];
    console.log('✅ Created test round:', testRound.id);
    
    // 2. Add a test ticket with number 50 (winning number)
    const ticketResult = await sql`
      INSERT INTO lottery_tickets (
        draw_id, 
        player_fid, 
        number, 
        purchase_price, 
        transaction_hash
      ) VALUES (
        ${testRound.id}, 
        12345, 
        50, 
        100000, 
        '0xtest123456789'
      )
      RETURNING *
    `;
    
    console.log('✅ Created winning ticket (50):', ticketResult[0].id);
    
    // 3. Add a few more test tickets
    const otherTickets = [1, 25, 75, 99];
    for (const number of otherTickets) {
      await sql`
        INSERT INTO lottery_tickets (
          draw_id, 
          player_fid, 
          number, 
          purchase_price, 
          transaction_hash
        ) VALUES (
          ${testRound.id}, 
          ${12345 + number}, 
          ${number}, 
          100000, 
          ${`0xtest${number}123456789`}
        )
      `;
    }
    
    console.log('✅ Created additional test tickets');
    
    return NextResponse.json({
      success: true,
      message: 'Test lottery setup complete!',
      testRound: {
        id: testRound.id,
        drawNumber: testRound.draw_number,
        jackpot: testRound.jackpot,
        status: testRound.status
      },
      testTickets: {
        winningNumber: 50,
        totalTickets: 5,
        ticketNumbers: [1, 25, 50, 75, 99]
      },
      instructions: {
        step1: 'Test lottery round created with ID: ' + testRound.id,
        step2: 'Winning number will be: 50',
        step3: 'Run the lottery draw script to complete the test',
        step4: 'Check lottery_winnings table for the winner'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error setting up test lottery:', error);
    return NextResponse.json({
      error: 'Failed to setup test lottery',
      details: error.message
    }, { status: 500 });
  }
}
