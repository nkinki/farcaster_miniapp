import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Farcaster API headers
function getApiHeaders() {
  const bearerToken = process.env.FARCASTER_BEARER_TOKEN
  if (!bearerToken) {
    return null // Return null if no token
  }
  
  return {
    "authorization": `Bearer ${bearerToken}`,
    "origin": "https://farcaster.xyz",
    "referer": "https://farcaster.xyz/",
    "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "accept": "*/*",
    "content-type": "application/json; charset=utf-8"
  }
}

// Download latest miniapp data from Farcaster API
async function downloadLatestRankings() {
  const url = "https://client.farcaster.xyz/v1/top-mini-apps?limit=100"
  const headers = getApiHeaders()
  
  if (!headers) {
    console.log("⚠️ No Bearer token available, using demo data")
    return null
  }
  
  const allMiniapps = []
  let cursor = null
  
  console.log("📥 Downloading miniapp rankings from Farcaster API...")
  
  try {
    while (true) {
      const fullUrl: string = cursor ? `${url}&cursor=${cursor}` : url
      const response = await fetch(fullUrl, { headers })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const miniapps = data.miniApps || []
      allMiniapps.push(...miniapps)
      
      console.log(`   Downloaded: ${miniapps.length} miniapps`)
      
      // Next page
      const nextCursor = data.next?.cursor
      if (nextCursor) {
        cursor = nextCursor
        console.log(`   Pagination, next cursor: ${cursor}`)
      } else {
        break
      }
    }
    
    console.log(`✅ Total downloaded: ${allMiniapps.length} miniapps`)
    return allMiniapps
  } catch (error) {
    console.error("❌ API download failed:", error)
    return null
  }
}

// Demo miniapp data (fallback)
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
    console.log("=== CRON JOB: Farcaster Miniapp Update ===")
    console.log(`Time: ${new Date().toISOString()}`)
    
    // Check if this is a cron job call
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Try to download real data first, fallback to demo data
    let miniappsData = await downloadLatestRankings()
    let dataSource = "API"
    
    if (!miniappsData) {
      console.log("🔄 Falling back to demo data")
      miniappsData = generateDemoData()
      dataSource = "Demo"
    }
    
    console.log(`✅ Data loaded: ${miniappsData.length} miniapps (${dataSource})`)
    
    // Save data to public folder for frontend
    const dataPath = path.join(process.cwd(), 'public', 'data', 'top_miniapps.json')
    const dataForFrontend = miniappsData.map(item => ({
      rank: item.rank,
      rank72hChange: item.rank72hChange,
      miniApp: {
        name: item.miniApp.name,
        domain: item.miniApp.domain,
        description: dataSource === "Demo" ? `Demo miniapp ${item.rank} - ${item.miniApp.primaryCategory}` : (item.miniApp.description || `Miniapp ${item.rank}`),
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
    
    // Save data
    fs.writeFileSync(dataPath, JSON.stringify(dataForFrontend, null, 2))
    
    console.log(`✅ Data saved to public/data/top_miniapps.json (${dataSource})`)
    
    return NextResponse.json({
      success: true,
      message: `Data updated successfully (${dataSource})`,
      miniappsCount: miniappsData.length,
      dataSource: dataSource,
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