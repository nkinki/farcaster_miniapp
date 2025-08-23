import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

interface PlayerSkill {
  fid: number
  skill: number
  gamesPlayed: number
  wins: number
  losses: number
  draws: number
  lastUpdated: Date
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerFid = searchParams.get("playerFid")

    if (!playerFid) {
      return NextResponse.json({ 
        success: false, 
        error: "Player FID is required" 
      }, { status: 400 })
    }

    // Játékos skill adatainak lekérdezése
    const skillResult = await sql`
      SELECT 
        p.fid,
        COALESCE(ps.skill, 1000) as skill,
        COALESCE(ps.games_played, 0) as games_played,
        COALESCE(ps.wins, 0) as wins,
        COALESCE(ps.losses, 0) as losses,
        COALESCE(ps.draws, 0) as draws,
        COALESCE(ps.last_updated, NOW()) as last_updated
      FROM (SELECT ${playerFid}::bigint as fid) p
      LEFT JOIN player_skills ps ON p.fid = ps.player_fid
    `

    if (skillResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Player not found" 
      }, { status: 404 })
    }

    const playerSkill = skillResult[0] as PlayerSkill

    return NextResponse.json({
      success: true,
      skill: playerSkill
    })

  } catch (error) {
    console.error('[Skill API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch player skill" 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { playerFid, gameResult, opponentSkill } = await request.json()

    if (!playerFid || !gameResult) {
      return NextResponse.json({ 
        success: false, 
        error: "Player FID and game result are required" 
      }, { status: 400 })
    }

    // ELO rating számítás
    const newSkill = calculateNewSkill(playerFid, gameResult, opponentSkill || 1000)
    
    // Skill frissítése az adatbázisban
    const updateResult = await sql`
      INSERT INTO player_skills (
        player_fid, skill, games_played, wins, losses, draws, last_updated
      ) VALUES (
        ${playerFid}, 
        ${newSkill.skill}, 
        ${newSkill.gamesPlayed}, 
        ${newSkill.wins}, 
        ${newSkill.losses}, 
        ${newSkill.draws}, 
        NOW()
      )
      ON CONFLICT (player_fid) 
      DO UPDATE SET
        skill = EXCLUDED.skill,
        games_played = EXCLUDED.games_played,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        draws = EXCLUDED.draws,
        last_updated = NOW()
      RETURNING *
    `

    console.log(`[Skill API] Updated skill for player ${playerFid}: ${newSkill.skill}`)

    return NextResponse.json({
      success: true,
      newSkill: newSkill
    })

  } catch (error) {
    console.error('[Skill API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to update player skill" 
    }, { status: 500 })
  }
}

// ELO rating számítás
function calculateNewSkill(
  playerFid: number, 
  gameResult: 'win' | 'loss' | 'draw', 
  opponentSkill: number
): { skill: number, gamesPlayed: number, wins: number, losses: number, draws: number } {
  
  // Alapértelmezett értékek
  let currentSkill = 1000
  let gamesPlayed = 0
  let wins = 0
  let losses = 0
  let draws = 0

  // ELO rating konstansok
  const K_FACTOR = 32
  const EXPECTED_SCORE = 1 / (1 + Math.pow(10, (opponentSkill - currentSkill) / 400))
  
  let actualScore: number
  let skillChange: number

  switch (gameResult) {
    case 'win':
      actualScore = 1
      wins = 1
      break
    case 'loss':
      actualScore = 0
      losses = 1
      break
    case 'draw':
      actualScore = 0.5
      draws = 1
      break
    default:
      actualScore = 0.5
      draws = 1
  }

  // Skill változás számítása
  skillChange = Math.round(K_FACTOR * (actualScore - EXPECTED_SCORE))
  const newSkill = Math.max(100, Math.min(3000, currentSkill + skillChange))
  
  gamesPlayed = 1

  return {
    skill: newSkill,
    gamesPlayed,
    wins,
    losses,
    draws
  }
}
