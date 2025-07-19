import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Demo miniapp data (no Bearer token required)
function generateDemoData() {
  const demoMiniapps = [
    {
      rank: 1,
      rank72hChange: 0,
      miniApp: {
        id: "demo-1",
        shortId: "demo1",
        name: "Demo Miniapp 1",
        domain: "demo1.farcaster.xyz",
        homeUrl: "https://demo1.farcaster.xyz",
        iconUrl: "https://via.placeholder.com/64",
        imageUrl: "https://via.placeholder.com/400x200",
        splashImageUrl: "https://via.placeholder.com/800x400",
        splashBackgroundColor: "#8b5cf6",
        buttonTitle: "Launch Demo 1",
        supportsNotifications: true,
        primaryCategory: "Social",
        author: {
          fid: 12345,
          username: "demo_user1",
          displayName: "Demo User 1",
          followerCount: 15000,
          followingCount: 500
        }
      }
    },
    {
      rank: 2,
      rank72hChange: 2,
      miniApp: {
        id: "demo-2",
        shortId: "demo2",
        name: "Demo Miniapp 2",
        domain: "demo2.farcaster.xyz",
        homeUrl: "https://demo2.farcaster.xyz",
        iconUrl: "https://via.placeholder.com/64",
        imageUrl: "https://via.placeholder.com/400x200",
        splashImageUrl: "https://via.placeholder.com/800x400",
        splashBackgroundColor: "#10b981",
        buttonTitle: "Launch Demo 2",
        supportsNotifications: false,
        primaryCategory: "Gaming",
        author: {
          fid: 67890,
          username: "demo_user2",
          displayName: "Demo User 2",
          followerCount: 8500,
          followingCount: 300
        }
      }
    },
    {
      rank: 3,
      rank72hChange: -1,
      miniApp: {
        id: "demo-3",
        shortId: "demo3",
        name: "Demo Miniapp 3",
        domain: "demo3.farcaster.xyz",
        homeUrl: "https://demo3.farcaster.xyz",
        iconUrl: "https://via.placeholder.com/64",
        imageUrl: "https://via.placeholder.com/400x200",
        splashImageUrl: "https://via.placeholder.com/800x400",
        splashBackgroundColor: "#f59e0b",
        buttonTitle: "Launch Demo 3",
        supportsNotifications: true,
        primaryCategory: "Finance",
        author: {
          fid: 11111,
          username: "demo_user3",
          displayName: "Demo User 3",
          followerCount: 22000,
          followingCount: 800
        }
      }
    }
  ]
  
  return demoMiniapps
}

// Main cron job function
export async function GET(request: NextRequest) {
  try {
    console.log("=== CRON JOB: Farcaster Miniapp Update (Demo) ===")
    console.log(`Time: ${new Date().toISOString()}`)
    
    // Check if this is a cron job call
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Generate demo data instead of downloading from API
    const miniappsData = generateDemoData()
    
    console.log(`✅ Demo data generated: ${miniappsData.length} miniapps`)
    
    // Save demo data to public folder for frontend
    const dataPath = path.join(process.cwd(), 'public', 'data', 'top_miniapps.json')
    const demoDataForFrontend = miniappsData.map(item => ({
      rank: item.rank,
      rank72hChange: item.rank72hChange,
      miniApp: {
        name: item.miniApp.name,
        domain: item.miniApp.domain,
        description: `Demo miniapp ${item.rank} - ${item.miniApp.primaryCategory}`,
        primaryCategory: item.miniApp.primaryCategory,
        iconUrl: item.miniApp.iconUrl,
        homeUrl: item.miniApp.homeUrl,
        author: item.miniApp.author
      }
    }))
    
    // Ensure directory exists
    const dir = path.dirname(dataPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // Save demo data
    fs.writeFileSync(dataPath, JSON.stringify(demoDataForFrontend, null, 2))
    
    console.log("✅ Demo data saved to public/data/top_miniapps.json")
    
    return NextResponse.json({
      success: true,
      message: 'Demo data updated successfully',
      miniappsCount: miniappsData.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 