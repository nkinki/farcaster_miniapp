import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Main cron job function - just copy existing data
export async function GET(request: NextRequest) {
  try {
    console.log("=== CRON JOB: Farcaster Miniapp Update ===")
    console.log(`Time: ${new Date().toISOString()}`)
    
    // Check if this is a cron job call
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Load existing data from the root directory
    const sourcePath = path.join(process.cwd(), '..', 'top_miniapps.json')
    const targetPath = path.join(process.cwd(), 'public', 'data', 'top_miniapps.json')
    
    if (!fs.existsSync(sourcePath)) {
      console.log("❌ Source data file not found")
      return NextResponse.json(
        { error: 'Source data file not found' },
        { status: 404 }
      )
    }
    
    // Read source data
    const sourceData = fs.readFileSync(sourcePath, 'utf8')
    const miniappsData = JSON.parse(sourceData)
    
    console.log(`✅ Loaded ${miniappsData.length} miniapps from source`)
    
    // Ensure target directory exists
    const targetDir = path.dirname(targetPath)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    
    // Copy data to public folder
    fs.writeFileSync(targetPath, sourceData)
    
    console.log(`✅ Data copied to public/data/top_miniapps.json`)
    
    return NextResponse.json({
      success: true,
      message: 'Data updated successfully',
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