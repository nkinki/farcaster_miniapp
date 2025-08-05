import type { PromoCast } from "@/types/promotions"

// Database Promotion interface (from usePromotions hook)
export interface Promotion {
  id: number
  fid: number
  username: string
  display_name: string | null
  cast_url: string
  share_text: string | null
  reward_per_share: number
  total_budget: number
  shares_count: number
  remaining_budget: number
  status: string
  created_at: string
  updated_at: string
}

/**
 * Converts database Promotion to frontend PromoCast format with validation
 */
export function mapPromotionToPromoCast(promotion: Promotion): PromoCast {
  // Validate required fields
  if (!promotion || typeof promotion.id !== "number") {
    throw new Error("Invalid promotion data: missing or invalid id")
  }

  return {
    id: promotion.id,
    fid: promotion.fid,
    username: promotion.username,
    displayName: promotion.display_name || promotion.username,
    castUrl: promotion.cast_url,
    shareText: promotion.share_text,
    rewardPerShare: promotion.reward_per_share,
    totalBudget: promotion.total_budget,
    sharesCount: promotion.shares_count,
    remainingBudget: promotion.remaining_budget,
    status: promotion.status as "active" | "inactive" | "paused" | "completed",
    createdAt: promotion.created_at,
    updatedAt: promotion.updated_at,
    // Add missing fields that PromoCast expects
    author: {
      fid: promotion.fid,
      username: promotion.username,
      displayName: promotion.display_name || promotion.username,
    },
  }
}

/**
 * Converts array of database Promotions to frontend PromoCast format with error handling
 */
export function mapPromotionsToPromoCasts(promotions: Promotion[]): PromoCast[] {
  if (!Array.isArray(promotions)) {
    console.warn("mapPromotionsToPromoCasts: Expected array, got:", typeof promotions)
    return []
  }

  return promotions
    .map((promotion) => {
      try {
        return mapPromotionToPromoCast(promotion)
      } catch (error) {
        console.error("Error mapping promotion:", error, promotion)
        return null
      }
    })
    .filter((promo): promo is PromoCast => promo !== null)
}
