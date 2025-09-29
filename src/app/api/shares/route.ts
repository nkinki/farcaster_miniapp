import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { promotionId, sharerFid, sharerUsername, castHash } = body;
  
  if (!promotionId || !sharerFid || !sharerUsername || !castHash) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    console.log(`Checking 48h cooldown for user ${sharerFid} on promotion ${promotionId}`);
    
    // Check if user can share this promotion (48h cooldown) - only check unclaimed shares
    const [lastShare] = await sql`
      SELECT created_at
      FROM shares 
      WHERE promotion_id = ${promotionId} AND sharer_fid = ${sharerFid}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (lastShare) {
      const lastShareTime = new Date(lastShare.created_at);
      const now = new Date();
      const hoursSinceLastShare = (now.getTime() - lastShareTime.getTime()) / (1000 * 60 * 60);
      
      console.log(`Last share was ${hoursSinceLastShare.toFixed(2)} hours ago`);
      
      if (hoursSinceLastShare < 48) {
        const hoursRemaining = 48 - hoursSinceLastShare;
        const h = Math.floor(hoursRemaining);
        const m = Math.floor((hoursRemaining - h) * 60);
        
        console.log(`48h cooldown active: ${h}h ${m}m remaining`);
        
        return NextResponse.json({ 
          error: `You can share this campaign again in ${h}h ${m}m` 
        }, { status: 400 });
      }
    } else {
      console.log(`No previous share found for user ${sharerFid} on promotion ${promotionId}`);
    }

    const [promo] = await sql`
      SELECT reward_per_share, remaining_budget, status, action_type 
      FROM promotions WHERE id = ${promotionId}
    `;

    if (!promo) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    if (promo.status !== 'active') {
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    }
    if (promo.remaining_budget < promo.reward_per_share) {
      await sql`UPDATE promotions SET status = 'completed' WHERE id = ${promotionId}`;
      return NextResponse.json({ error: 'Insufficient budget for this share' }, { status: 400 });
    }

    console.log(`Recording new share for user ${sharerFid} on promotion ${promotionId}`);

    // Record the share with action_type
    await sql`
      INSERT INTO shares (promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount, action_type)
      VALUES (${promotionId}, ${sharerFid}, ${sharerUsername}, ${castHash}, ${promo.reward_per_share}, ${promo.action_type})
    `;

    // Update promotion
    await sql`
      UPDATE promotions
      SET 
        shares_count = shares_count + 1, 
        remaining_budget = remaining_budget - ${promo.reward_per_share}
      WHERE id = ${promotionId}
    `;

    // Check if campaign should be marked as completed after this share
    const [updatedPromo] = await sql`
      SELECT remaining_budget, reward_per_share 
      FROM promotions WHERE id = ${promotionId}
    `;

    if (updatedPromo && updatedPromo.remaining_budget <= 0) {
      await sql`UPDATE promotions SET status = 'completed' WHERE id = ${promotionId}`;
      console.log(`Campaign ${promotionId} marked as completed - budget exhausted`);
    } else if (updatedPromo && updatedPromo.remaining_budget < updatedPromo.reward_per_share) {
      await sql`UPDATE promotions SET status = 'completed' WHERE id = ${promotionId}`;
      console.log(`Campaign ${promotionId} marked as completed - insufficient budget for next share`);
    }

    console.log(`Share recorded successfully for user ${sharerFid}`);

    // Add season points for share/quote actions
    try {
      // Get current active season ID
      const [seasonResult] = await sql`
        SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
      `;
      
      if (seasonResult) {
        const seasonId = seasonResult.id;
        
        // Add point transaction
        await sql`
          INSERT INTO point_transactions (
            user_fid, season_id, action_type, points_earned, metadata
          ) VALUES (${sharerFid}, ${seasonId}, ${promo.action_type || 'quote'}, 1, ${JSON.stringify({ 
            promotion_id: promotionId,
            cast_hash: castHash,
            timestamp: new Date().toISOString()
          })})
        `;

        // Update user season summary
        await sql`
          INSERT INTO user_season_summary (
            user_fid, season_id, total_points, total_shares, 
            last_activity
          ) VALUES (${sharerFid}, ${seasonId}, 1, 1, NOW())
          ON CONFLICT (user_fid, season_id) 
          DO UPDATE SET 
            total_points = user_season_summary.total_points + 1,
            total_shares = user_season_summary.total_shares + 1,
            last_activity = NOW(),
            updated_at = NOW()
        `;

        console.log(`✅ Season points added for ${promo.action_type || 'quote'} action`);
      }
    } catch (seasonError) {
      console.warn('⚠️ Season tracking failed (non-critical):', seasonError);
      // Don't fail the main transaction for season tracking
    }

    // Add note for like_recast promotions
    const responseData: any = { success: true, message: "Share recorded successfully" };
    if (promo.action_type === 'like_recast') {
      responseData.note = "🚧 Like & Recast functionality is under development";
    }

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('API Error in POST /api/shares:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
