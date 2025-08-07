import { type NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.NEON_DB_URL!)

// Enhanced user stats interface
interface UserStats {
  fid: number
  total_shares: number
  total_earnings: number
  pending_rewards: number
  active_campaigns: number
  completed_campaigns: number
  last_share_date: string | null
  last_claim_date: string | null
}

export async function GET(request: NextRequest, { params }: { params: { fid: string } }) {
  try {
    // Extract FID from URL path
    const fid = parseInt(params.fid, 10)
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid FID' }, { status: 400 })
    }

    // Enhanced query to get comprehensive user statistics
    const [userStatsResult, campaignStatsResult, recentActivityResult] = await Promise.all([
      // Basic user statistics - separate total earnings from pending rewards
      sql`
        SELECT 
            COUNT(DISTINCT s.id) AS total_shares,
            COALESCE(SUM(s.reward_amount), 0) AS total_earnings,
            COALESCE(SUM(CASE WHEN s.reward_claimed = FALSE THEN s.reward_amount ELSE 0 END), 0) AS pending_rewards,
            MAX(s.created_at) AS last_share_date,
            MAX(s.claimed_at) AS last_claim_date
        FROM shares s
        WHERE s.sharer_fid = ${fid};
      `,

      // Campaign statistics (user's own campaigns)
      sql`
        SELECT
          COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_campaigns,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_campaigns,
          COUNT(CASE WHEN status = 'paused' THEN 1 END) AS paused_campaigns,
          COUNT(*) AS total_campaigns
        FROM promotions
        WHERE fid = ${fid};
      `,

      // Recent activity (last 7 days)
      sql`
        SELECT
          COUNT(DISTINCT s.id) AS recent_shares,
          COUNT(DISTINCT s.promotion_id) AS recent_campaigns_shared,
          COALESCE(SUM(s.reward_amount), 0) AS recent_earnings
        FROM shares s
        WHERE s.sharer_fid = ${fid}
          AND s.created_at >= NOW() - INTERVAL '7 days';
      `,
    ])

    const userStats = userStatsResult[0]
    const campaignStats = campaignStatsResult[0]
    const recentActivity = recentActivityResult[0]

    // Type-safe data parsing
    const responseData: {
      user: UserStats & {
        campaign_stats: {
          active_campaigns: number
          completed_campaigns: number
          paused_campaigns: number
          total_campaigns: number
        }
        recent_activity: {
          shares_last_7_days: number
          campaigns_shared_last_7_days: number
          earnings_last_7_days: number
        }
      }
    } = {
      user: {
        fid: fid,
        total_shares: Number.parseInt(userStats.total_shares as string, 10),
        total_earnings: Number.parseFloat(userStats.total_earnings as string),
        pending_rewards: Number.parseFloat(userStats.pending_rewards as string),
        active_campaigns: Number.parseInt(campaignStats.active_campaigns as string, 10),
        completed_campaigns: Number.parseInt(campaignStats.completed_campaigns as string, 10),
        last_share_date: userStats.last_share_date as string | null,
        last_claim_date: userStats.last_claim_date as string | null,
        campaign_stats: {
          active_campaigns: Number.parseInt(campaignStats.active_campaigns as string, 10),
          completed_campaigns: Number.parseInt(campaignStats.completed_campaigns as string, 10),
          paused_campaigns: Number.parseInt(campaignStats.paused_campaigns as string, 10),
          total_campaigns: Number.parseInt(campaignStats.total_campaigns as string, 10),
        },
        recent_activity: {
          shares_last_7_days: Number.parseInt(recentActivity.recent_shares as string, 10),
          campaigns_shared_last_7_days: Number.parseInt(recentActivity.recent_campaigns_shared as string, 10),
          earnings_last_7_days: Number.parseFloat(recentActivity.recent_earnings as string),
        },
      },
    }

    // Add cache headers for better performance
    const response = NextResponse.json(responseData, { status: 200 })
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")

    return response
  } catch (error: any) {
    console.error("API Error in GET /api/users/[fid]:", {
      error: error.message,
      stack: error.stack,
      fid: request.url,
    })

    // More specific error responses
    if (error.message?.includes("connection")) {
      return NextResponse.json(
        {
          error: "Database connection failed. Please try again later.",
        },
        { status: 503 },
      )
    }

    if (error.message?.includes("timeout")) {
      return NextResponse.json(
        {
          error: "Request timeout. Please try again.",
        },
        { status: 408 },
      )
    }

    return NextResponse.json(
      {
        error: "Internal server error. Please contact support if this persists.",
      },
      { status: 500 },
    )
  }
}

// Optional: Add POST method for updating user preferences
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split("/")
    const fidString = pathSegments[pathSegments.length - 1]
    const fid = Number.parseInt(fidString, 10)

    if (isNaN(fid) || fid <= 0) {
      return NextResponse.json(
        {
          error: "Invalid Farcaster ID",
        },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "mark_notifications_read":
        // Mark user's notifications as read
        await sql`
          UPDATE user_notifications 
          SET read_at = NOW() 
          WHERE fid = ${fid} AND read_at IS NULL;
        `
        return NextResponse.json({ success: true })

      case "update_preferences":
        const { email_notifications, push_notifications } = body
        // Update user preferences (if you have a user_preferences table)
        await sql`
          INSERT INTO user_preferences (fid, email_notifications, push_notifications, updated_at)
          VALUES (${fid}, ${email_notifications}, ${push_notifications}, NOW())
          ON CONFLICT (fid) 
          DO UPDATE SET 
            email_notifications = EXCLUDED.email_notifications,
            push_notifications = EXCLUDED.push_notifications,
            updated_at = NOW();
        `
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json(
          {
            error: "Invalid action",
          },
          { status: 400 },
        )
    }
  } catch (error: any) {
    console.error("API Error in POST /api/users/[fid]:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}