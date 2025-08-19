import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Használj Pool-t a tranzakciókhoz
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// Farcaster API ellenőrzés
async function verifyWithFarcasterAPI(userFid: number, castHash: string, actionType: 'like' | 'recast') {
  try {
    // Farcaster API endpoint
    const response = await fetch(`https://api.farcaster.xyz/v2/casts/${castHash}/reactions`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Farcaster API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ellenőrizzük a user reakcióit
    const userReactions = data.reactions?.filter((r: any) => r.reactor?.fid === userFid) || [];
    
    if (actionType === 'like') {
      return userReactions.some((r: any) => r.reaction_type === 'like');
    } else if (actionType === 'recast') {
      return userReactions.some((r: any) => r.reaction_type === 'recast');
    }
    
    return false;
  } catch (error) {
    console.error('Farcaster API verification failed:', error);
    return null; // null = nem sikerült ellenőrizni
  }
}

// Warpcast API fallback
async function verifyWithWarpcastAPI(userFid: number, castHash: string, actionType: 'like' | 'recast') {
  try {
    const response = await fetch(`https://api.warpcast.com/v2/casts/${castHash}/reactions`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Warpcast API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (actionType === 'like') {
      return data.reactions?.some((r: any) => r.reactor?.fid === userFid && r.type === 'like') || false;
    } else if (actionType === 'recast') {
      return data.reactions?.some((r: any) => r.reactor?.fid === userFid && r.type === 'recast') || false;
    }
    
    return false;
  } catch (error) {
    console.error('Warpcast API verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
    const client = await pool.connect();
    try {
        const body = await request.json();
        const { promotionId, userFid, actionType, castHash } = body;

        // 1. Alapvető validáció
        if (!promotionId || !userFid || !actionType || !castHash) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (!['like', 'recast', 'both'].includes(actionType)) {
            return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
        }

        let rewardGranted = false;
        let message = actionType === 'both' 
            ? 'Both like and recast actions recorded.' 
            : `Action '${actionType}' recorded.`;
        let verificationMethod = 'pending';

        // Adatbázis tranzakció indítása
        await client.query('BEGIN');

        // 2. Automatikus ellenőrzés Farcaster API-val
        let isVerified = await verifyWithFarcasterAPI(userFid, castHash, actionType);
        
        // Ha nem sikerült, próbáljuk Warpcast API-val
        if (isVerified === null) {
            isVerified = await verifyWithWarpcastAPI(userFid, castHash, actionType);
        }
        
        // Ha automatikus ellenőrzés sikeres
        if (isVerified === true) {
            verificationMethod = 'auto';
            message = `Action '${actionType}' automatically verified and recorded.`;
        } else if (isVerified === false) {
            // User nem végezte el a műveletet
            verificationMethod = 'failed';
            message = `Action '${actionType}' verification failed - action not found.`;
        } else {
            // Nem sikerült automatikusan ellenőrizni -> manual verification
            verificationMethod = 'manual';
            message = `Action '${actionType}' recorded for manual verification.`;
        }

        // 3. Részfeladat rögzítése verification method-dal
        if (actionType === 'both') {
            // For 'both' action type, create separate like and recast actions
            // Ensure verificationMethod is properly set for both actions
            const likeVerificationMethod = verificationMethod || 'manual';
            const recastVerificationMethod = verificationMethod || 'manual';
            
            await client.query(
                `INSERT INTO like_recast_user_actions (promotion_id, user_fid, action_type, verification_method, cast_hash)
                 VALUES ($1, $2, 'like', $3, $4)
                 ON CONFLICT (promotion_id, user_fid, action_type) 
                 DO UPDATE SET verification_method = $3, cast_hash = $4, updated_at = CURRENT_TIMESTAMP`,
                [promotionId, userFid, likeVerificationMethod, castHash]
            );
            
            await client.query(
                `INSERT INTO like_recast_user_actions (promotion_id, user_fid, action_type, verification_method, cast_hash)
                 VALUES ($1, $2, 'recast', $3, $4)
                 ON CONFLICT (promotion_id, user_fid, action_type) 
                 DO UPDATE SET verification_method = $3, cast_hash = $4, updated_at = CURRENT_TIMESTAMP`,
                [promotionId, userFid, recastVerificationMethod, castHash]
            );
        } else {
            // Single action type (like or recast)
            await client.query(
                `INSERT INTO like_recast_user_actions (promotion_id, user_fid, action_type, verification_method, cast_hash)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (promotion_id, user_fid, action_type) 
                 DO UPDATE SET verification_method = $4, cast_hash = $5, updated_at = CURRENT_TIMESTAMP`,
                [promotionId, userFid, actionType, verificationMethod, castHash]
            );
        }

        // 4. Teljesítés ellenőrzése (csak automatikusan ellenőrzött vagy manual verification alatt álló)
        const { rows: completedActions } = await client.query(
            `SELECT COUNT(*) as count, 
                    COUNT(CASE WHEN verification_method = 'auto' THEN 1 END) as auto_verified,
                    COUNT(CASE WHEN verification_method = 'manual' THEN 1 END) as manual_pending
             FROM like_recast_user_actions
             WHERE promotion_id = $1 AND user_fid = $2`,
            [promotionId, userFid]
        );

        const actionCount = parseInt(completedActions[0].count, 10);
        const autoVerifiedCount = parseInt(completedActions[0].auto_verified, 10);
        const manualPendingCount = parseInt(completedActions[0].manual_pending, 10);

        // 5. Jutalmazás logika
        if (actionCount === 2) {
            // Csak akkor jutalmazzunk, ha mindkét automatikusan ellenőrzött
            if (autoVerifiedCount === 2) {
                const { rows: promoRows } = await client.query(
                    `SELECT reward_per_share, remaining_budget FROM promotions WHERE id = $1 AND status = 'active'`,
                    [promotionId]
                );

                if (promoRows.length > 0) {
                    const promotion = promoRows[0];
                    const rewardAmount = promotion.reward_per_share;

                    if (promotion.remaining_budget >= rewardAmount) {
                        const completionResult = await client.query(
                            `INSERT INTO like_recast_completions (promotion_id, user_fid, reward_amount, verification_method)
                             VALUES ($1, $2, $3, 'auto')
                             ON CONFLICT (promotion_id, user_fid) DO NOTHING`,
                            [promotionId, userFid, rewardAmount]
                        );

                        if (completionResult.rowCount) { 
                            await client.query(
                                `UPDATE promotions 
                                 SET remaining_budget = remaining_budget - $1,
                                     shares_count = shares_count + 1
                                 WHERE id = $2`,
                                [rewardAmount, promotionId]
                            );

                            rewardGranted = true;
                            message = 'Congratulations! Both actions automatically verified and reward granted!';
                        } else {
                            message = 'Both actions completed, but reward has already been claimed.';
                        }
                    } else {
                        message = 'Both actions completed, but promotion has insufficient budget.';
                    }
                }
            } else if (manualPendingCount > 0) {
                // Manual verification szükséges
                message = 'Both actions recorded. Manual verification required before reward can be granted.';
                
                // Hozzáadjuk a manual verification queue-hoz
                await client.query(
                    `INSERT INTO manual_verifications (action_id, status, notes)
                     SELECT id, 'pending', 'Both like and recast actions recorded, awaiting manual verification'
                     FROM like_recast_user_actions 
                     WHERE promotion_id = $1 AND user_fid = $2
                     ON CONFLICT (action_id) DO NOTHING`,
                    [promotionId, userFid]
                );
            }
        }

        // Tranzakció véglegesítése
        await client.query('COMMIT');

        return NextResponse.json({ 
            success: true, 
            rewardGranted, 
            message,
            verificationMethod,
            note: "🚧 Like & Recast functionality is under development"
        }, { status: 200 });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('API Error in POST /api/like-recast-actions:', error);
        return NextResponse.json({ error: 'Failed to submit action' }, { status: 500 });
    } finally {
        client.release();
    }
}