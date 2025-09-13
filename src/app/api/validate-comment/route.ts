import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      parentCastHash, 
      userFid, 
      commentText,
      promotionId 
    } = body;

    if (!parentCastHash || !userFid || !commentText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    
    // Check if we have a valid Neynar API key (not just placeholder)
    if (!neynarApiKey || neynarApiKey === 'your-neynar-api-key-here' || neynarApiKey === 'NEYNAR_API_DOCS') {
      console.log('🧪 Mock mode: Neynar API key not configured or is placeholder');
      
      // Mock validation for testing - always returns true for now
      // In production, you might want to implement alternative validation
      return NextResponse.json({
        success: true,
        validated: true,
        comment: {
          hash: 'mock-comment-hash-' + Date.now(),
          text: commentText,
          author: { fid: userFid },
          parent: { hash: parentCastHash }
        },
        message: 'Mock comment validation successful (Neynar API not configured)',
        mock: true
      }, { status: 200 });
    }

    // Get cast replies using Neynar API
    const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/cast/replies?identifier=${parentCastHash}&type=hash&limit=50`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api_key': neynarApiKey,
      }
    });

    if (!neynarResponse.ok) {
      const errorData = await neynarResponse.text();
      console.error('Neynar API Error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to fetch cast replies',
        details: errorData
      }, { status: neynarResponse.status });
    }

    const repliesData = await neynarResponse.json();
    const replies = repliesData.casts || [];

    console.log(`🔍 Checking ${replies.length} replies for user ${userFid} and text: "${commentText}"`);

    // Look for matching comment
    const matchingComment = replies.find((reply: any) => {
      const authorMatches = reply.author?.fid === userFid;
      const textMatches = reply.text?.toLowerCase().includes(commentText.toLowerCase()) || 
                         commentText.toLowerCase().includes(reply.text?.toLowerCase());
      
      console.log(`📝 Checking reply:`, {
        authorFid: reply.author?.fid,
        userFid,
        authorMatches,
        replyText: reply.text,
        commentText,
        textMatches
      });
      
      return authorMatches && textMatches;
    });

    if (matchingComment) {
      console.log('✅ Comment validation successful:', matchingComment.hash);
      
      return NextResponse.json({
        success: true,
        validated: true,
        comment: {
          hash: matchingComment.hash,
          text: matchingComment.text,
          author: matchingComment.author,
          parent: { hash: parentCastHash },
          timestamp: matchingComment.timestamp
        },
        message: 'Comment validation successful'
      }, { status: 200 });
    } else {
      console.log('❌ Comment validation failed: No matching comment found');
      
      return NextResponse.json({
        success: false,
        validated: false,
        message: 'Comment not found or does not match',
        searchedReplies: replies.length,
        userFid,
        commentText
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error('❌ Comment Validation API Error:', error);
    return NextResponse.json({
      error: 'Failed to validate comment',
      message: error.message
    }, { status: 500 });
  }
}
