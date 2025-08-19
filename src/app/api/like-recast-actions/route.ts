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
        } else {
            // Single action type - próbáljuk automatikus verifikációt
            let isVerified = await verifyWithFarcasterAPI(userFid, castHash, actionType);
            
            if (isVerified === null) {
                isVerified = await verifyWithWarpcastAPI(userFid, castHash, actionType);
            }
            
            if (isVerified === true) {
                verificationMethod = 'auto';
                message = `Action '${actionType}' automatically verified and recorded.`;
            } else if (isVerified === false) {
                verificationMethod = 'failed';
                message = `Action '${actionType}' verification failed - action not found.`;
            } else {
                verificationMethod = 'manual';
                message = `Action '${actionType}' recorded for manual verification.`;
            }
        }

        // 3. Részfeladat rögzítése verification method-dal
        if (actionType === 'both') {
            // For 'both' action type, create separate like and recast actions
            console.log('📝 Inserting both like and recast actions with verification method:', verificationMethod);
            
            await client.query(
                `INSERT INTO like_recast_user_actions (promotion_id, user_fid, action_type, verification_method, cast_hash)
                 VALUES ($1, $2, 'like', $3, $4)
                 ON CONFLICT (promotion_id, user_fid, action_type) 
                 DO UPDATE SET verification_method = $3, cast_hash = $4, updated_at = CURRENT_TIMESTAMP`,
                [promotionId, userFid, verificationMethod, castHash]
            );
            
            await client.query(
                `INSERT INTO like_recast_user_actions (promotion_id, user_fid, action_type, verification_method, cast_hash)
                 VALUES ($1, $2, 'recast', $3, $4)
                 ON CONFLICT (promotion_id, user_fid, action_type) 
                 DO UPDATE SET verification_method = $3, cast_hash = $4, updated_at = CURRENT_TIMESTAMP`,
                [promotionId, userFid, verificationMethod, castHash]
            );
            
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
            
            // Hozzáadjuk a manual verification queue-hoz
            await client.query(
                `INSERT INTO manual_verifications (action_id, status, notes, promotion_id, user_fid)
                 SELECT id, 'pending', $1, promotion_id, user_fid
                 FROM like_recast_user_actions 
                 WHERE promotion_id = $2 AND user_fid = $3
                 ON CONFLICT (action_id) DO NOTHING`,
                [`${actionType === 'both' ? 'Both like and recast' : actionType} actions recorded, awaiting manual verification`, promotionId, userFid]
            );
            
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