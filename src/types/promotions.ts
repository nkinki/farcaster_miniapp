export interface PromoCast {
  id: number
  fid: number
  username: string
  displayName: string
  castUrl: string
  shareText: string | null
  rewardPerShare: number
  totalBudget: number
  sharesCount: number
  remainingBudget: number
  status: "active" | "inactive" | "paused" | "completed"
  createdAt: string
  updatedAt: string
  author: {
    fid: number
    username: string
    displayName: string
  }
}

// Database Promotion interface (for reference)
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

// User interface for components
export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
}

// Share timer interface
export interface ShareTimer {
  promotionId: number
  canShareAt: string
  timeRemaining: number
}
