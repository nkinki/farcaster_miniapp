import { getSSLHubRpcClient, Message } from "@farcaster/hub-nodejs";

// Farcaster Hub client - try multiple endpoints
const hubEndpoints = [
  "nemes.farcaster.xyz:2283",
  "hub-grpc.pinata.cloud:443",
  "hub.farcaster.standardcrypto.vc:2283"
];

let client = getSSLHubRpcClient(hubEndpoints[0]);

// Function to try different hub endpoints
async function getWorkingClient() {
  for (const endpoint of hubEndpoints) {
    try {
      console.log(`🔗 Trying hub endpoint: ${endpoint}`);
      const testClient = getSSLHubRpcClient(endpoint);
      // Test the connection with a simple call
      await testClient.getHubInfo();
      console.log(`✅ Connected to hub: ${endpoint}`);
      return testClient;
    } catch (error) {
      console.warn(`⚠️ Failed to connect to ${endpoint}:`, error);
    }
  }
  throw new Error('No working hub endpoints found');
}

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

    // Get working client
    const workingClient = await getWorkingClient();

    // Convert cast hash to bytes
    const castHashBytes = Buffer.from(castHash.slice(2), 'hex');
    console.log(`🔧 Cast hash bytes length: ${castHashBytes.length}`);

    // Check for like reactions
    console.log(`🔍 Checking likes for cast ${castHash} by author ${authorFid}...`);
    const likeResult = await workingClient.getReactionsByTarget({
      targetCastId: {
        fid: authorFid,
        hash: castHashBytes,
      },
      reactionType: 1, // Like = 1
    });

    // Check for recast reactions  
    console.log(`🔍 Checking recasts for cast ${castHash} by author ${authorFid}...`);
    const recastResult = await workingClient.getReactionsByTarget({
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
      console.log(`📊 Found ${likes.length} likes for cast ${castHash}`);
      hasLike = likes.some((message: Message) => 
        message.data?.fid === userFid && 
        message.data?.reactionBody?.type === 1
      );
      console.log(`👍 Like check: ${hasLike ? 'FOUND' : 'NOT FOUND'} for user ${userFid}`);
    } else {
      console.error(`❌ Failed to fetch likes:`, likeResult.error);
      // Don't fail completely, continue with recast check
    }

    // Check if user recasted the cast
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
      // Don't fail completely, return partial results
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