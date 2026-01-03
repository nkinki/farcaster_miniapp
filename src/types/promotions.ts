// This is the central type definition file
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
  actionType: 'quote' | 'like_recast' | 'comment' | 'follow' // Add actionType field
  // Comment functionality fields
  commentTemplates?: string[] // Array of selected comment templates
  customComment?: string | null // Custom comment text
  allowCustomComments?: boolean // Allow users to add custom comments
}

// Database Promotion interface (for data coming from the database)
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
  action_type: 'quote' | 'like_recast' | 'comment' | 'follow' // Add action_type field
  // Comment functionality fields
  comment_templates?: string[] | null // Array of selected comment templates (JSON from DB)
  custom_comment?: string | null // Custom comment text
  allow_custom_comments?: boolean | null // Allow users to add custom comments
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
