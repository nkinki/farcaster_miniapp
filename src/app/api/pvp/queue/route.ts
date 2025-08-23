import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

interface QueuePlayer {
  fid: number
  name: string
  avatar?: string
  skill: number
  joinedAt: Date
  connectionId: string
}

// In-memory queue tárolás (production-ben Redis vagy database)
let matchmakingQueue: QueuePlayer[] = []

export async function POST(request: NextRequest) {
  try {
    const { playerFid, playerName, playerAvatar, playerSkill, connectionId } = await request.json()

    if (!playerFid || !playerName) {
      return NextResponse.json({ 
        success: false, 
        error: "Player FID and name are required" 
      }, { status: 400 })
    }

    // Játékos hozzáadása a queue-hoz
    const player: QueuePlayer = {
      fid: playerFid,
      name: playerName,
      avatar: playerAvatar,
      skill: playerSkill || 1000, // Default skill level
      joinedAt: new Date(),
      connectionId: connectionId || `${playerFid}-${Date.now()}`
    }

    // Ellenőrizzük, hogy a játékos már nincs-e a queue-ban
    const existingIndex = matchmakingQueue.findIndex(p => p.fid === playerFid)
    if (existingIndex !== -1) {
      matchmakingQueue[existingIndex] = player // Frissítjük
    } else {
      matchmakingQueue.push(player)
    }

    console.log(`[Queue] Player ${playerFid} joined queue. Total players: ${matchmakingQueue.length}`)

    // Skill-based matching próbálkozás
    const match = findBestMatch(player)
    
    if (match) {
      // Match találva! Mindkét játékost eltávolítjuk a queue-ból
      matchmakingQueue = matchmakingQueue.filter(p => 
        p.fid !== player.fid && p.fid !== match.fid
      )
      
      console.log(`[Queue] Match found: ${player.fid} vs ${match.fid}`)
      
      return NextResponse.json({
        success: true,
        match: {
          opponent: {
            fid: match.fid,
            name: match.name,
            avatar: match.avatar,
            skill: match.skill
          },
          estimatedWaitTime: 0
        }
      })
    } else {
      // Nincs match, visszajelzést adunk a várakozási időről
      const estimatedWaitTime = calculateEstimatedWaitTime(player.skill)
      
      return NextResponse.json({
        success: true,
        match: null,
        queuePosition: getQueuePosition(player.fid),
        estimatedWaitTime,
        totalPlayersInQueue: matchmakingQueue.length
      })
    }

  } catch (error) {
    console.error('[Queue] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to join queue" 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { playerFid } = await request.json()

    if (!playerFid) {
      return NextResponse.json({ 
        success: false, 
        error: "Player FID is required" 
      }, { status: 400 })
    }

    // Játékos eltávolítása a queue-ból
    const initialLength = matchmakingQueue.length
    matchmakingQueue = matchmakingQueue.filter(p => p.fid !== playerFid)
    
    console.log(`[Queue] Player ${playerFid} left queue. Removed: ${initialLength - matchmakingQueue.length}`)

    return NextResponse.json({
      success: true,
      message: "Successfully left queue"
    })

  } catch (error) {
    console.error('[Queue] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to leave queue" 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Queue statisztikák
    const queueStats = {
      totalPlayers: matchmakingQueue.length,
      averageSkill: matchmakingQueue.length > 0 
        ? Math.round(matchmakingQueue.reduce((sum, p) => sum + p.skill, 0) / matchmakingQueue.length)
        : 0,
      skillDistribution: getSkillDistribution(),
      estimatedWaitTimes: getEstimatedWaitTimes()
    }

    return NextResponse.json({
      success: true,
      stats: queueStats
    })

  } catch (error) {
    console.error('[Queue] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to get queue stats" 
    }, { status: 500 })
  }
}

// Helper függvények
function findBestMatch(player: QueuePlayer): QueuePlayer | null {
  if (matchmakingQueue.length < 2) return null

  // Skill-based matching: ±200 skill pont különbség
  const skillRange = 200
  const potentialMatches = matchmakingQueue.filter(p => 
    p.fid !== player.fid &&
    Math.abs(p.skill - player.skill) <= skillRange
  )

  if (potentialMatches.length === 0) return null

  // Legjobb skill match kiválasztása
  return potentialMatches.reduce((best, current) => {
    const bestDiff = Math.abs(best.skill - player.skill)
    const currentDiff = Math.abs(current.skill - player.skill)
    return currentDiff < bestDiff ? current : best
  })
}

function calculateEstimatedWaitTime(playerSkill: number): number {
  const similarSkillPlayers = matchmakingQueue.filter(p => 
    Math.abs(p.skill - playerSkill) <= 200
  ).length

  if (similarSkillPlayers >= 2) return 5 // 5 másodperc
  if (similarSkillPlayers >= 1) return 15 // 15 másodperc
  return 30 // 30 másodperc
}

function getQueuePosition(playerFid: number): number {
  const index = matchmakingQueue.findIndex(p => p.fid === playerFid)
  return index !== -1 ? index + 1 : 0
}

function getSkillDistribution() {
  const skillRanges = [
    { range: '0-800', count: 0 },
    { range: '801-1200', count: 0 },
    { range: '1201-1600', count: 0 },
    { range: '1601-2000', count: 0 },
    { range: '2000+', count: 0 }
  ]

  matchmakingQueue.forEach(player => {
    if (player.skill <= 800) skillRanges[0].count++
    else if (player.skill <= 1200) skillRanges[1].count++
    else if (player.skill <= 1600) skillRanges[2].count++
    else if (player.skill <= 2000) skillRanges[3].count++
    else skillRanges[4].count++
  })

  return skillRanges
}

function getEstimatedWaitTimes() {
  return {
    lowSkill: calculateEstimatedWaitTime(800),
    mediumSkill: calculateEstimatedWaitTime(1200),
    highSkill: calculateEstimatedWaitTime(1800)
  }
}
