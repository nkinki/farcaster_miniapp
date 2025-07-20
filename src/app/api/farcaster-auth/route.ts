import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'signIn') {
      // Real Farcaster authentication would go here
      // For now, we'll return mock data that looks like real Farcaster user data
      
      const mockUser = {
        fid: Math.floor(Math.random() * 100000) + 1000,
        username: 'farcaster_user',
        displayName: 'Farcaster User',
        pfp: 'https://picsum.photos/200',
        followerCount: Math.floor(Math.random() * 500) + 50,
        followingCount: Math.floor(Math.random() * 200) + 20
      }

      return NextResponse.json(mockUser)
    }

    if (action === 'signOut') {
      // Real Farcaster sign-out would go here
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Farcaster auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
} 