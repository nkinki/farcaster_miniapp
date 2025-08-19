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

        console.log('🔍 Like/Recast API called with:', { promotionId, userFid, actionType, castHash });

        // 1. Alapvető validáció
        if (!promotionId || !userFid || !actionType || !castHash) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (!['like', 'recast', 'both'].includes(actionType)) {
            return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
        }

        let rewardGranted = false;
        let message = '';
        let verificationMethod = 'manual'; // Default to manual for now

        // Adatbázis tranzakció indítása
        await client.query('BEGIN');

        // 2. Egyszerűsített verifikáció - minden 'both' action manual verification
        if (actionType === 'both') {
            verificationMethod = 'manual';
            message = 'Both like and recast actions recorded for manual verification.';
            console.log('📝 Both action type detected - using manual verification');
        } else {
            // Single action type - próbáljuk automatikus verifikációt
            console.log('🔍 Attempting automatic verification for single action:', actionType);
            let isVerified = await verifyWithFarcasterAPI(userFid, castHash, actionType);
            
            if (isVerified === null) {
                isVerified = await verifyWithWarpcastAPI(userFid, castHash, actionType);
            }
            
            if (isVerified === true) {
                verificationMethod = 'auto';
                message = `Action '${actionType}' automatically verified and recorded.`;
                console.log('✅ Automatic verification successful');
            } else if (isVerified === false) {
                verificationMethod = 'failed';
                message = `Action '${actionType}' verification failed - action not found.`;
                console.log('❌ Automatic verification failed - action not found');
            } else {
                verificationMethod = 'manual';
                message = `Action '${actionType}' recorded for manual verification.`;
                console.log('⚠️ Automatic verification unavailable - using manual');
            }
        }

        // 3. Részfeladat rögzítése verification method-dal
        if (actionType === 'both') {
            // For 'both' action type, create separate like and recast actions
            console.log('📝 Inserting both like and recast actions with verification method:', verificationMethod);
            console.log('📊 Parameters:', { promotionId, userFid, verificationMethod, castHash });
            
            // Insert LIKE action
            const likeResult = await client.query(
                `INSERT INTO like_recast_user_actions (promotion_id, user_fid, action_type, verification_method, cast_hash)
                 VALUES ($1, $2, 'like', $3, $4)
                 ON CONFLICT (promotion_id, user_fid, action_type) 
                 DO UPDATE SET verification_method = $3, cast_hash = $4, updated_at = CURRENT_TIMESTAMP
                 RETURNING id`,
                [promotionId, userFid, verificationMethod, castHash]
            );
            console.log('✅ LIKE action inserted/updated with ID:', likeResult.rows[0]?.id);
            
            // Insert RECAST action
            const recastResult = await client.query(
                `INSERT INTO like_recast_user_actions (promotion_id, user_fid, action_type, verification_method, cast_hash)
                 VALUES ($1, $2, 'recast', $3, $4)
                 ON CONFLICT (promotion_id, user_fid, action_type) 
                 DO UPDATE SET verification_method = $3, cast_hash = $4, updated_at = CURRENT_TIMESTAMP
                 RETURNING id`,
                [promotionId, userFid, verificationMethod, castHash]
            );
            console.log('✅ RECAST action inserted/updated with ID:', recastResult.rows[0]?.id);
            
            console.log('✅ Both actions inserted successfully');
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

        // 4. Manual verification queue-hoz hozzáadás (ha manual verification)
        if (verificationMethod === 'manual') {
            console.log('📋 Adding to manual verification queue');
            
            if (actionType === 'both') {
                // For 'both' action type, add both actions to manual verification queue
                const { rows: bothActions } = await client.query(
                    `SELECT id FROM like_recast_user_actions 
                     WHERE promotion_id = $1 AND user_fid = $2 AND action_type IN ('like', 'recast')
                     ORDER BY action_type`,
                    [promotionId, userFid]
                );
                
                console.log('📝 Found actions for manual verification:', bothActions);
                
                for (const action of bothActions) {
                    await client.query(
                        `INSERT INTO manual_verifications (action_id, status, notes)
                         VALUES ($1, 'pending', $2)
                         ON CONFLICT (action_id) DO NOTHING`,
                        [action.id, 'Both like and recast actions recorded, awaiting manual verification']
                    );
                    console.log('✅ Added action ID', action.id, 'to manual verification queue');
                }
                
                // 5. Automatikus reward jóváírás ha mindkét action manual
                if (bothActions.length === 2) {
                    console.log('🎯 Both actions recorded - attempting automatic reward grant');
                    
                    // Ellenőrizzük a promotion adatait
                    const { rows: promoRows } = await client.query(
                        `SELECT reward_per_share, remaining_budget FROM promotions WHERE id = $1 AND status = 'active'`,
                        [promotionId]
                    );
                    
                    if (promoRows.length > 0) {
                        const promotion = promoRows[0];
                        const rewardAmount = promotion.reward_per_share;
                        
                        if (promotion.remaining_budget >= rewardAmount) {
                            console.log(`💰 Granting automatic reward: ${rewardAmount} to user ${userFid}`);
                            
                            // Record completion
                            await client.query(
                                `INSERT INTO like_recast_completions (promotion_id, user_fid, reward_amount, verification_method)
                                 VALUES ($1, $2, $3, 'auto_manual')
                                 ON CONFLICT (promotion_id, user_fid) DO NOTHING`,
                                [promotionId, userFid, rewardAmount]
                            );
                            
                            // Update promotion budget
                            await client.query(
                                `UPDATE promotions 
                                 SET remaining_budget = remaining_budget - $1,
                                     shares_count = shares_count + 1
                                 WHERE id = $2`,
                                [rewardAmount, promotionId]
                            );
                            
                            // Update user earnings
                            await client.query(
                                `UPDATE users 
                                 SET total_earnings = total_earnings + $1,
                                     pending_rewards = pending_rewards + $1,
                                     updated_at = CURRENT_TIMESTAMP
                                 WHERE fid = $2`,
                                [rewardAmount, userFid]
                            );
                            
                            // Update both actions as verified
                            await client.query(
                                `UPDATE like_recast_user_actions 
                                 SET verification_method = 'verified', updated_at = CURRENT_TIMESTAMP
                                 WHERE promotion_id = $1 AND user_fid = $2`,
                                [promotionId, userFid]
                            );
                            
                            rewardGranted = true;
                            message = '🎉 Both actions completed! Reward automatically granted!';
                            verificationMethod = 'auto_manual';
                            
                            console.log('✅ Automatic reward granted successfully!');
                        } else {
                            console.log('⚠️ Insufficient budget for automatic reward');
                        }
                    }
                }
            } else {
                // Single action type
                const { rows: singleAction } = await client.query(
                    `SELECT id FROM like_recast_user_actions 
                     WHERE promotion_id = $1 AND user_fid = $2 AND action_type = $3`,
                    [promotionId, userFid, actionType]
                );
                
                if (singleAction.length > 0) {
                    await client.query(
                        `INSERT INTO manual_verifications (action_id, status, notes)
                         VALUES ($1, 'pending', $2)
                         ON CONFLICT (action_id) DO NOTHING`,
                        [singleAction[0].id, `${actionType} action recorded, awaiting manual verification`]
                    );
                    console.log('✅ Added single action to manual verification queue');
                }
            }
            
            console.log('✅ Added to manual verification queue');
        }

        // Tranzakció véglegesítése
        await client.query('COMMIT');

        console.log('🎉 Transaction committed successfully');

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