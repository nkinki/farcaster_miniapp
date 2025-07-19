import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Neon DB connection
const pool = new Pool({
  connectionString: process.env.NEON_DB_URL,
})

// Farcaster API headers
function getApiHeaders() {
  const bearerToken = process.env.FARCASTER_BEARER_TOKEN
  if (!bearerToken) {
    throw new Error('FARCASTER_BEARER_TOKEN environment variable not set')
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
  
  const allMiniapps = []
  let cursor = null
  
  console.log("📥 Downloading miniapp rankings...")
  
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
}

// Define types for miniapp data
interface MiniappData {
  miniApp: {
    id: string
    shortId: string
    name: string
    domain: string
    homeUrl: string
    iconUrl: string
    imageUrl: string
    splashImageUrl: string
    splashBackgroundColor: string
    buttonTitle: string
    supportsNotifications?: boolean
    primaryCategory: string
    author?: {
      fid: number
      username: string
      displayName: string
      followerCount: number
      followingCount: number
    }
  }
  rank: number
  rank72hChange: number
}

// Update database with new data
async function updateDatabase(miniappsData: MiniappData[]) {
  const client = await pool.connect()
  
  try {
    const today = new Date().toISOString().split('T')[0]
    let insertedMiniapps = 0
    let insertedRankings = 0
    
    console.log("💾 Updating database...")
    
    // Process data
    for (const item of miniappsData) {
      const miniapp = item.miniApp
      const rank = item.rank
      const rank72hChange = item.rank72hChange
      
      // 1. Insert/update miniapp metadata
      await client.query(`
        INSERT INTO miniapps (
          id, short_id, name, domain, home_url, icon_url, image_url,
          splash_image_url, splash_background_color, button_title,
          supports_notifications, primary_category, author_fid,
          author_username, author_display_name, author_follower_count,
          author_following_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          domain = EXCLUDED.domain,
          home_url = EXCLUDED.home_url,
          icon_url = EXCLUDED.icon_url,
          image_url = EXCLUDED.image_url,
          splash_image_url = EXCLUDED.splash_image_url,
          splash_background_color = EXCLUDED.splash_background_color,
          button_title = EXCLUDED.button_title,
          supports_notifications = EXCLUDED.supports_notifications,
          primary_category = EXCLUDED.primary_category,
          author_fid = EXCLUDED.author_fid,
          author_username = EXCLUDED.author_username,
          author_display_name = EXCLUDED.author_display_name,
          author_follower_count = EXCLUDED.author_follower_count,
          author_following_count = EXCLUDED.author_following_count
      `, [
        miniapp.id,
        miniapp.shortId,
        miniapp.name,
        miniapp.domain,
        miniapp.homeUrl,
        miniapp.iconUrl,
        miniapp.imageUrl,
        miniapp.splashImageUrl,
        miniapp.splashBackgroundColor,
        miniapp.buttonTitle,
        miniapp.supportsNotifications || false,
        miniapp.primaryCategory,
        miniapp.author?.fid,
        miniapp.author?.username,
        miniapp.author?.displayName,
        miniapp.author?.followerCount,
        miniapp.author?.followingCount
      ])
      insertedMiniapps++
      
      // 2. Insert daily ranking
      await client.query(`
        INSERT INTO miniapp_rankings (
          miniapp_id, ranking_date, rank, rank_72h_change
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (miniapp_id, ranking_date) DO UPDATE SET
          rank = EXCLUDED.rank,
          rank_72h_change = EXCLUDED.rank_72h_change
      `, [
        miniapp.id,
        today,
        rank,
        rank72hChange
      ])
      insertedRankings++
    }
    
    // 3. Save complete snapshot
    await client.query(`
      INSERT INTO ranking_snapshots (
        snapshot_date, total_miniapps, raw_json
      ) VALUES ($1, $2, $3)
      ON CONFLICT (snapshot_date) DO UPDATE SET
        total_miniapps = EXCLUDED.total_miniapps,
        raw_json = EXCLUDED.raw_json
    `, [
      today,
      miniappsData.length,
      JSON.stringify(miniappsData)
    ])
    
    console.log(`✅ Database updated!`)
    console.log(`   - Miniapps: ${insertedMiniapps}`)
    console.log(`   - Rankings: ${insertedRankings}`)
    console.log(`   - Snapshot: ${today}`)
    
  } finally {
    client.release()
  }
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
    
    // Download latest data
    const miniappsData = await downloadLatestRankings()
    
    // Update database
    await updateDatabase(miniappsData)
    
    console.log("✅ Cron job completed successfully!")
    
    return NextResponse.json({
      success: true,
      message: 'Database updated successfully',
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