import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

if (!process.env.NEON_DB_URL) {
  throw new Error("NEON_DB_URL is not set")
}

const sql = neon(process.env.NEON_DB_URL)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promotionId, sharerFid, sharerUsername, castHash } = body

    console.log("🎯 Share API called:", { promotionId, sharerFid, sharerUsername, castHash })

    // Validate required fields
    if (!promotionId || !sharerFid || !sharerUsername) {
      return NextResponse.json(
        { error: "Missing required fields: promotionId, sharerFid, sharerUsername" },
        { status: 400 },
      )
    }

    // 1. ELLENŐRIZZÜK A KAMPÁNY STÁTUSZÁT ÉS KÖLTSÉGVETÉSÉT
    const promotionResult = await sql`
      SELECT 
        id, 
        status, 
        remaining_budget, 
        reward_per_share,
        total_budget,
        fid as promoter_fid
      FROM promotions 
      WHERE id = ${promotionId}
    `

    if (promotionResult.length === 0) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 })
    }

    const promotion = promotionResult[0]

    // Ellenőrizzük a státuszt
    if (promotion.status !== "active") {
      console.log("❌ Promotion is not active:", promotion.status)
      return NextResponse.json(
        { error: `Campaign is ${promotion.status}. Only active campaigns can be shared.` },
        { status: 400 },
      )
    }

    // Ellenőrizzük a költségvetést
    if (promotion.remaining_budget < promotion.reward_per_share) {
      console.log("❌ Insufficient budget:", {
        remaining: promotion.remaining_budget,
        reward: promotion.reward_per_share,
      })

      // Automatikusan paused státuszra állítjuk
      await sql`
        UPDATE promotions 
        SET status = 'paused', updated_at = NOW()
        WHERE id = ${promotionId}
      `

      return NextResponse.json({ error: "Campaign budget exhausted. Campaign has been paused." }, { status: 400 })
    }

    // 2. ELLENŐRIZZÜK A 48 ÓRÁS COOLDOWN-T
    const existingShareResult = await sql`
      SELECT created_at 
      FROM shares 
      WHERE promotion_id = ${promotionId} 
        AND sharer_fid = ${sharerFid}
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (existingShareResult.length > 0) {
      const lastShareTime = new Date(existingShareResult[0].created_at)
      const now = new Date()
      const timeDiff = now.getTime() - lastShareTime.getTime()
      const hoursDiff = timeDiff / (1000 * 60 * 60)

      if (hoursDiff < 48) {
        const remainingHours = 48 - hoursDiff
        console.log("❌ Cooldown active:", { hoursDiff, remainingHours })

        return NextResponse.json(
          {
            error: `You can share this campaign again in ${Math.ceil(remainingHours)} hours.`,
            cooldownRemaining: remainingHours,
          },
          { status: 429 },
        )
      }
    }

    // 3. ELLENŐRIZZÜK, HOGY NEM SAJÁT KAMPÁNYA-E
    if (promotion.promoter_fid === sharerFid) {
      return NextResponse.json({ error: "You cannot share your own campaign" }, { status: 400 })
    }

    // 4. RÖGZÍTJÜK A SHARE-T ÉS FRISSÍTJÜK A KÖLTSÉGVETÉST
    const result = await sql.transaction(async (tx) => {
      // Share rögzítése
      const shareResult = await tx`
        INSERT INTO shares (
          promotion_id, 
          sharer_fid, 
          sharer_username, 
          cast_hash, 
          reward_amount, 
          created_at
        )
        VALUES (
          ${promotionId}, 
          ${sharerFid}, 
          ${sharerUsername}, 
          ${castHash || null}, 
          ${promotion.reward_per_share}, 
          NOW()
        )
        RETURNING id, created_at
      `

      // Promotion frissítése
      const updatedPromotion = await tx`
        UPDATE promotions 
        SET 
          shares_count = shares_count + 1,
          remaining_budget = remaining_budget - ${promotion.reward_per_share},
          updated_at = NOW()
        WHERE id = ${promotionId}
        RETURNING remaining_budget, shares_count
      `

      // Ha elfogyott a budget, paused státuszra állítjuk
      if (updatedPromotion[0].remaining_budget < promotion.reward_per_share) {
        await tx`
          UPDATE promotions 
          SET status = 'paused', updated_at = NOW()
          WHERE id = ${promotionId}
        `
      }

      return {
        shareId: shareResult[0].id,
        shareCreatedAt: shareResult[0].created_at,
        newSharesCount: updatedPromotion[0].shares_count,
        remainingBudget: updatedPromotion[0].remaining_budget,
      }
    })

    console.log("✅ Share recorded successfully:", result)

    return NextResponse.json({
      success: true,
      message: `Share recorded! You earned ${promotion.reward_per_share} CHESS.`,
      data: {
        shareId: result.shareId,
        rewardAmount: promotion.reward_per_share,
        sharesCount: result.newSharesCount,
        remainingBudget: result.remainingBudget,
        nextShareAvailable: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
    })
  } catch (error: any) {
    console.error("❌ Share API Error:", {
      error: error.message,
      stack: error.stack,
      body: await request.json().catch(() => ({})),
    })

    // Specific error handling
    if (error.message?.includes("duplicate key")) {
      return NextResponse.json({ error: "This share has already been recorded" }, { status: 409 })
    }

    if (error.message?.includes("foreign key")) {
      return NextResponse.json({ error: "Invalid promotion or user reference" }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to record share. Please try again." }, { status: 500 })
  }
}

// GET method for fetching user's shares
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fid = searchParams.get("fid")
    const promotionId = searchParams.get("promotionId")

    if (!fid) {
      return NextResponse.json({ error: "FID parameter is required" }, { status: 400 })
    }

    let query = `
      SELECT 
        s.id,
        s.promotion_id,
        s.sharer_fid,
        s.sharer_username,
        s.reward_amount,
        s.created_at,
        s.cast_hash,
        p.cast_url,
        p.status as promotion_status,
        p.reward_per_share
      FROM shares s
      JOIN promotions p ON s.promotion_id = p.id
      WHERE s.sharer_fid = ${fid}
    `

    if (promotionId) {
      query += ` AND s.promotion_id = ${promotionId}`
    }

    query += ` ORDER BY s.created_at DESC`

    const shares = await sql.unsafe(query)

    return NextResponse.json({
      success: true,
      shares: shares,
      total: shares.length,
    })
  } catch (error: any) {
    console.error("❌ GET Shares API Error:", error)
    return NextResponse.json({ error: "Failed to fetch shares" }, { status: 500 })
  }
}
