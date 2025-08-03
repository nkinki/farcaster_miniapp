// Itt definiáljuk a megosztott típusokat, hogy minden fájl innen tudja importálni őket.

export interface PromoCast {
  id: string;
  castUrl: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl?: string;
  };
  rewardPerShare: number;
  totalBudget: number;
  sharesCount: number;
  remainingBudget: number;
  shareText?: string;
  createdAt: string;
  status: "active" | "paused" | "completed" | "inactive";
  blockchainHash?: string;
}

export interface DatabasePromotion {
  id: number;
  fid: number;
  username: string;
  display_name: string | null;
  cast_url: string;
  share_text: string | null;
  reward_per_share: number;
  total_budget: number;
  shares_count: number;
  remaining_budget: number;
  status: "active" | "paused" | "completed" | "inactive";
  blockchain_hash: string | null;
  created_at: string;
  updated_at: string;
}