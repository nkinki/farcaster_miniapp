import { getSSLHubRpcClient, Message } from "@farcaster/hub-nodejs";

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
    console.log(`🔍 Verifying like & recast for user ${userFid} on cast ${castHash} by author ${authorFid}`);

    // Try multiple hub endpoints
    const hubEndpoints = [
      "hub-grpc.pinata.cloud:443",
      "nemes.farcaster.xyz:2283",
      "hub.farcaster.standardcrypto.vc:2283"
    ];

    let client;
    let workingEndpoint = null;

    // Find working endpoint
    for (const endpoint of hubEndpoints) {
      try {
        console.log(`🔗 Trying hub endpoint: ${endpoint}`);
        const testClient = getSSLHubRpcClient(endpoint);
        
        // Test with a simple call
        await testClient.getInfo({});
        
        client = testClient;
        workingEndpoint = endpoint;
        console.log(`✅ Connected to hub: ${endpoint}`);
        break;
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${endpoint}:`, error);
      }
    }

    if (!client) {
      throw new Error('No working hub endpoints found');
    }

    // Convert cast hash to bytes
    const castHashBytes = Buffer.from(castHash.slice(2), 'hex');
    console.log(`🔧 Cast hash bytes length: ${castHashBytes.length}`);

    let hasLike = false;
    let hasRecast = false;

    // Check for like reactions
    try {
      console.log(`🔍 Checking likes for cast ${castHash} by author ${authorFid}...`);
      const likeResult = await client.getReactionsByTarget({
        targetCastId: {
          fid: authorFid,
          hash: castHashBytes,
        },
        reactionType: 1, // Like = 1
      });

      if (likeResult.isOk()) {
        const likes = likeResult.value.messages;
        console.log(`📊 Found ${likes.length} likes for cast ${castHash}`);
        hasLike = likes.some((message: Message) => 
          message.data?.fid === userFid && 
          message.data?.reactionBody?.type === 1
        );
        console.log(`👍 Like check: ${hasLike ? 'FOUND' : 'NOT FOUND'} for user ${userFid}`);
      } else {
        console.error(`❌ Failed to fetch likes:`, likeResult.error);
      }
    } catch (error) {
      console.error(`❌ Like check error:`, error);
    }

    // Check for recast reactions  
    try {
      console.log(`🔍 Checking recasts for cast ${castHash} by author ${authorFid}...`);
      const recastResult = await client.getReactionsByTarget({
        targetCastId: {
          fid: authorFid,
          hash: castHashBytes,
        },
        reactionType: 2, // Recast = 2
      });

      if (recastResult.isOk()) {
        const recasts = recastResult.value.messages;
        console.log(`📊 Found ${recasts.length} recasts for cast ${castHash}`);
        hasRecast = recasts.some((message: Message) => 
          message.data?.fid === userFid && 
          message.data?.reactionBody?.type === 2
        );
        console.log(`🔄 Recast check: ${hasRecast ? 'FOUND' : 'NOT FOUND'} for user ${userFid}`);
      } else {
        console.error(`❌ Failed to fetch recasts:`, recastResult.error);
      }
    } catch (error) {
      console.error(`❌ Recast check error:`, error);
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