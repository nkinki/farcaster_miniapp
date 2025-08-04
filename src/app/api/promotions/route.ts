import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL environment variable is not set');
}

const sql = neon(process.env.NEON_DB_URL);

// A GET függvény változatlan maradhat.
export async function GET(request: NextRequest) {
    // ... a GET kódod itt ...
}


// A POST függvényt módosítjuk.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fid, username, displayName, castUrl, shareText, 
      rewardPerShare, totalBudget, blockchainHash, status, 
      contractCampaignId // Az új mező fogadása
    } = body;

    if (
      !fid || !username || !castUrl || !rewardPerShare || 
      !totalBudget || !status || contractCampaignId === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields, including contractCampaignId.' },
        { status: 400 }
      );
    }
    
    const [promotion] = await sql`
      INSERT INTO promotions (
        fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, blockchain_hash, status,
        contract_campaign_id -- Az új oszlop
      ) VALUES (
        ${fid}, ${username}, ${displayName || null}, ${castUrl}, ${shareText || null},
        ${rewardPerShare}, ${totalBudget}, ${totalBudget}, ${blockchainHash || null}, ${status},
        ${contractCampaignId} -- Az új érték
      )
      RETURNING *;
    `;

    return NextResponse.json({ promotion }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create promotion',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}