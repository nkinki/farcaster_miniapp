import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

if (!process.env.NEON_DB_URL) {
  throw new Error("NEON_DB_URL is not set")
}

const sql = neon(process.env.NEON_DB_URL)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fid = searchParams.get("fid")

    if (!fid) {
      return NextResponse.json({ error: "FID parameter is required" }, { status: 400 })
    }

    // Lekérjük az összes aktív kampányt és a felhasználó utolsó share-jeit
    const result = await sql`
      SELECT 
        p.id as promotion_id,
        p.cast_url,
        p.status,
        p.remaining_budget,
        p.reward_per_share,
        s.shared_at as last_share_time,
        CASE 
          WHEN s.shared_at IS NULL THEN true
          WHEN s.shared_at < NOW() - INTERVAL '48 hours' THEN true
          ELSE false
        END as can_share,
        CASE 
          WHEN s.shared_at IS NULL THEN 0
          WHEN s.shared_at < NOW() - INTERVAL '48 hours' THEN 0
          ELSE EXTRACT(EPOCH FROM (s.shared_at + INTERVAL '48 hours' - NOW())) / 3600
        END as time_remaining_hours
      FROM promotions p
      LEFT JOIN (
        SELECT 
          promotion_id, 
          sharer_fid, 
          MAX(shared_at) as shared_at
        FROM shares 
        WHERE sharer_fid = ${fid}
        GROUP BY promotion_id, sharer_fid
      ) s ON p.id = s.promotion_id
      WHERE p.status = 'active' 
        AND p.remaining_budget >= p.reward_per_share
        AND p.fid != ${fid}  -- Exclude user's own campaigns
      ORDER BY p.id
    `

    const timers = result.map((row: any) => ({
      promotionId: row.promotion_id,
      canShare: row.can_share,
      timeRemaining: Math.max(0, row.time_remaining_hours),
      lastShareTime: row.last_share_time,
      campaignStatus: row.status,
      remainingBudget: row.remaining_budget,
      rewardPerShare: row.reward_per_share,
    }))

    return NextResponse.json({
      success: true,
      timers: timers,
      total: timers.length,
    })
  } catch (error: any) {
    console.error("❌ Share Timers API Error:", error)
    return NextResponse.json({ error: "Failed to fetch share timers" }, { status: 500 })
  }
}
