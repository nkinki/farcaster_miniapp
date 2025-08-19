import { getSSLHubRpcClient, Message } from "@farcaster/hub-nodejs";

// Farcaster Hub client
const client = getSSLHubRpcClient("nemes.farcaster.xyz:2283");

export interface VerificationResult {
  success: boolean;
  hasLike: boolean;
  hasRecast: boolean;
  error?: string;
}

/**
 * Verify if a user has liked and recasted a specific cast
 */
export async function verifyLikeAndRecast(
  userFid: number,
  castHash: string,
  authorFid: number
): Promise<VerificationResult> {
  try {
    console.log(`🔍 Verifying like & recast for user ${userFid} on cast ${castHash}`);

    // Convert cast hash to bytes
    const castHashBytes = Buffer.from(castHash.slice(2), 'hex');

    // Check for like reactions
    const likeResult = await client.getReactionsByTarget({
      targetCastId: {
        fid: authorFid,
        hash: castHashBytes,
      },
      reactionType: 1, // Like = 1
    });

    // Check for recast reactions  
    const recastResult = await client.getReactionsByTarget({
      targetCastId: {
        fid: authorFid,
        hash: castHashBytes,
      },
      reactionType: 2, // Recast = 2
    });

    let hasLike = false;
    let hasRecast = false;

    // Check if user liked the cast
    if (likeResult.isOk()) {
      const likes = likeResult.value.messages;
      hasLike = likes.some((message: Message) => 
        message.data?.fid === userFid && 
        message.data?.reactionBody?.type === 1
      );
      console.log(`👍 Like check: ${hasLike ? 'FOUND' : 'NOT FOUND'} for user ${userFid}`);
    } else {
      console.warn(`⚠️ Failed to fetch likes:`, likeResult.error);
    }

    // Check if user recasted the cast
    if (recastResult.isOk()) {
      const recasts = recastResult.value.messages;
      hasRecast = recasts.some((message: Message) => 
        message.data?.fid === userFid && 
        message.data?.reactionBody?.type === 2
      );
      console.log(`🔄 Recast check: ${hasRecast ? 'FOUND' : 'NOT FOUND'} for user ${userFid}`);
    } else {
      console.warn(`⚠️ Failed to fetch recasts:`, recastResult.error);
    }

    return {
      success: true,
      hasLike,
      hasRecast
    };

  } catch (error: any) {
    console.error('❌ Farcaster verification error:', error);
    return {
      success: false,
      hasLike: false,
      hasRecast: false,
      error: error.message
    };
  }
}

/**
 * Extract cast hash and author FID from cast URL
 */
export function parseCastUrl(castUrl: string): { authorFid: number; castHash: string } | null {
  try {
    // Example: https://farcaster.xyz/hamdanyusuf/0x1eaecd09
    const urlParts = castUrl.split('/');
    const castHash = urlParts[urlParts.length - 1];
    
    // For now, we'll need to get the author FID from the promotion data
    // This is a simplified version - in production you might want to resolve username to FID
    
    return {
      authorFid: 0, // Will be filled from promotion data
      castHash: castHash.startsWith('0x') ? castHash : `0x${castHash}`
    };
  } catch (error) {
    console.error('❌ Failed to parse cast URL:', error);
    return null;
  }
}

/**
 * Verify actions with retry logic
 */
export async function verifyWithRetry(
  userFid: number,
  castHash: string,
  authorFid: number,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<VerificationResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Verification attempt ${attempt}/${maxRetries}`);
    
    const result = await verifyLikeAndRecast(userFid, castHash, authorFid);
    
    if (result.success && result.hasLike && result.hasRecast) {
      console.log(`✅ Verification successful on attempt ${attempt}`);
      return result;
    }
    
    if (attempt < maxRetries) {
      console.log(`⏳ Waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Final attempt result
  return await verifyLikeAndRecast(userFid, castHash, authorFid);
}